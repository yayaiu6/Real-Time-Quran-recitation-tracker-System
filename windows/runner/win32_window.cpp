#include "win32_window.h"

#include <dwmapi.h>
#include <flutter_windows.h>

#include "resource.h"

namespace {

/// Window attribute that enables dark mode window decorations.
///
/// Redefined in case the developer's machine has a Windows SDK older than
/// version 10.0.22000.0.
/// See: https://docs.microsoft.com/windows/win32/api/dwmapi/ne-dwmapi-dwmwindowattribute
#ifndef DWMWA_USE_IMMERSIVE_DARK_MODE
#define DWMWA_USE_IMMERSIVE_DARK_MODE 20
#endif

constexpr const wchar_t kWindowClassName[] = L"FLUTTER_RUNNER_WIN32_WINDOW";

/// Registry key for app theme preference.
///
/// A value of 0 indicates apps should use dark mode. A non-zero or missing
/// value indicates apps should use light mode.
constexpr const wchar_t kGetPreferredBrightnessRegKey[] =
  L"Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize";
constexpr const wchar_t kGetPreferredBrightnessRegValue[] = L"AppsUseLightTheme";

// The number of Win32Window objects that currently exist.
static int g_active_window_count = 0;

using EnableNonClientDpiScaling = BOOL __stdcall(HWND hwnd);

// Scale helper to convert logical scaler values to physical using passed in
// scale factor
int Scale(int source, double scale_factor) {
  return static_cast<int>(source * scale_factor);
}

// Dynamically loads |AdjustWindowRectExForDpi| from User32 if available.
BOOL AdjustWindowRectForDpi(LPRECT lpRect, DWORD dwStyle, BOOL bMenu, DWORD dwExStyle, UINT dpi) {
  HMODULE user32 = GetModuleHandleW(L"user32.dll");
  if (user32) {
    using AdjustWindowRectExForDpiType = BOOL(WINAPI*)(LPRECT, DWORD, BOOL, DWORD, UINT);
    auto pAdjustWindowRectExForDpi = reinterpret_cast<AdjustWindowRectExForDpiType>(
        GetProcAddress(user32, "AdjustWindowRectExForDpi"));
    if (pAdjustWindowRectExForDpi) {
      return pAdjustWindowRectExForDpi(lpRect, dwStyle, bMenu, dwExStyle, dpi);
    }
  }
  return AdjustWindowRectEx(lpRect, dwStyle, bMenu, dwExStyle);
}

// Retrieves window DPI safely across Windows versions.
UINT GetWindowDpi(HWND hwnd) {
  HMODULE user32 = GetModuleHandleW(L"user32.dll");
  if (user32) {
    using GetDpiForWindowType = UINT(WINAPI*)(HWND);
    auto pGetDpiForWindow = reinterpret_cast<GetDpiForWindowType>(
        GetProcAddress(user32, "GetDpiForWindow"));
    if (pGetDpiForWindow) {
      return pGetDpiForWindow(hwnd);
    }
  }
  HDC hdc = GetDC(hwnd);
  UINT dpi = GetDeviceCaps(hdc, LOGPIXELSY);
  ReleaseDC(hwnd, hdc);
  return dpi ? dpi : 96;
}

// Dynamically loads the |EnableNonClientDpiScaling| from the User32 module.
// This API is only needed for PerMonitor V1 awareness mode.
void EnableFullDpiSupportIfAvailable(HWND hwnd) {
  HMODULE user32_module = LoadLibraryA("User32.dll");
  if (!user32_module) {
    return;
  }
  auto enable_non_client_dpi_scaling =
      reinterpret_cast<EnableNonClientDpiScaling*>(
          GetProcAddress(user32_module, "EnableNonClientDpiScaling"));
  if (enable_non_client_dpi_scaling != nullptr) {
    enable_non_client_dpi_scaling(hwnd);
  }
  FreeLibrary(user32_module);
}

}  // namespace

// Manages the Win32Window's window class registration.
class WindowClassRegistrar {
 public:
  ~WindowClassRegistrar() = default;

  // Returns the singleton registrar instance.
  static WindowClassRegistrar* GetInstance() {
    if (!instance_) {
      instance_ = new WindowClassRegistrar();
    }
    return instance_;
  }

  // Returns the name of the window class, registering the class if it hasn't
  // previously been registered.
  const wchar_t* GetWindowClass();

  // Unregisters the window class. Should only be called if there are no
  // instances of the window.
  void UnregisterWindowClass();

 private:
  WindowClassRegistrar() = default;

  static WindowClassRegistrar* instance_;

  bool class_registered_ = false;
};

WindowClassRegistrar* WindowClassRegistrar::instance_ = nullptr;

const wchar_t* WindowClassRegistrar::GetWindowClass() {
  if (!class_registered_) {
    WNDCLASS window_class{};
    window_class.hCursor = LoadCursor(nullptr, IDC_ARROW);
    window_class.lpszClassName = kWindowClassName;
    window_class.style = CS_HREDRAW | CS_VREDRAW;
    window_class.cbClsExtra = 0;
    window_class.cbWndExtra = 0;
    window_class.hInstance = GetModuleHandle(nullptr);
    window_class.hIcon =
        LoadIcon(window_class.hInstance, MAKEINTRESOURCE(IDI_APP_ICON));
    window_class.hbrBackground = 0;
    window_class.lpszMenuName = nullptr;
    window_class.lpfnWndProc = Win32Window::WndProc;
    RegisterClass(&window_class);
    class_registered_ = true;
  }
  return kWindowClassName;
}

void WindowClassRegistrar::UnregisterWindowClass() {
  UnregisterClass(kWindowClassName, nullptr);
  class_registered_ = false;
}

Win32Window::Win32Window() {
  ++g_active_window_count;
}

Win32Window::~Win32Window() {
  --g_active_window_count;
  Destroy();
}

bool Win32Window::Create(const std::wstring& title,
                         const Point& origin,
                         const Size& size) {
  Destroy();

  const wchar_t* window_class =
      WindowClassRegistrar::GetInstance()->GetWindowClass();

  const POINT target_point = {static_cast<LONG>(origin.x),
                              static_cast<LONG>(origin.y)};
  HMONITOR monitor = MonitorFromPoint(target_point, MONITOR_DEFAULTTONEAREST);
  UINT dpi = FlutterDesktopGetDpiForMonitor(monitor);
  double scale_factor = dpi / 96.0;

  // Modern Android flagship aspect ratio (Samsung Galaxy S24/S25/S26 standard: 412x892 dp, 19.5:9)
  const double target_aspect_ratio = static_cast<double>(size.width) / static_cast<double>(size.height);

  // Desired client area in physical pixels (Flutter viewport)
  int desired_client_width = Scale(size.width, scale_factor);
  int desired_client_height = Scale(size.height, scale_factor);

  // Modern phone window style: Resizable with locked aspect ratio, no maximize button
  DWORD window_style = WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU | WS_MINIMIZEBOX | WS_THICKFRAME;
  DWORD window_ex_style = WS_EX_APPWINDOW;

  // Measure window frame decorations (titlebar and borders)
  RECT test_frame = {0, 0, desired_client_width, desired_client_height};
  AdjustWindowRectForDpi(&test_frame, window_style, FALSE, window_ex_style, dpi);
  int frame_extra_w = (test_frame.right - test_frame.left) - desired_client_width;
  int frame_extra_h = (test_frame.bottom - test_frame.top) - desired_client_height;

  // Query active monitor's working area (excluding Windows taskbar)
  MONITORINFO monitor_info = {sizeof(MONITORINFO)};
  int work_x = 0;
  int work_y = 0;
  int work_width = desired_client_width + frame_extra_w;
  int work_height = desired_client_height + frame_extra_h;
  if (GetMonitorInfo(monitor, &monitor_info)) {
    work_x = monitor_info.rcWork.left;
    work_y = monitor_info.rcWork.top;
    work_width = monitor_info.rcWork.right - monitor_info.rcWork.left;
    work_height = monitor_info.rcWork.bottom - monitor_info.rcWork.top;
  }

  // Ensure window fits within the display working area without clipping below taskbar
  int max_allowed_win_h = work_height - Scale(32, scale_factor);
  if ((desired_client_height + frame_extra_h) > max_allowed_win_h) {
    desired_client_height = max_allowed_win_h - frame_extra_h;
    desired_client_width = static_cast<int>(desired_client_height * target_aspect_ratio + 0.5);
  }

  // Compute final window rect so that the client area is exactly the desired size
  RECT window_rect = {0, 0, desired_client_width, desired_client_height};
  AdjustWindowRectForDpi(&window_rect, window_style, FALSE, window_ex_style, dpi);
  int final_win_w = window_rect.right - window_rect.left;
  int final_win_h = window_rect.bottom - window_rect.top;

  // Center on screen if origin is (0,0) or default, otherwise use origin
  int pos_x;
  int pos_y;
  if (origin.x == 0 && origin.y == 0) {
    pos_x = work_x + (work_width - final_win_w) / 2;
    pos_y = work_y + (work_height - final_win_h) / 2;
  } else {
    pos_x = Scale(origin.x, scale_factor);
    pos_y = Scale(origin.y, scale_factor);
  }

  HWND window = CreateWindowEx(
      window_ex_style, window_class, title.c_str(), window_style,
      pos_x, pos_y, final_win_w, final_win_h,
      nullptr, nullptr, GetModuleHandle(nullptr), this);

  if (!window) {
    return false;
  }

  UpdateTheme(window);

  return OnCreate();
}

bool Win32Window::Show() {
  return ShowWindow(window_handle_, SW_SHOWNORMAL);
}

// static
LRESULT CALLBACK Win32Window::WndProc(HWND const window,
                                      UINT const message,
                                      WPARAM const wparam,
                                      LPARAM const lparam) noexcept {
  if (message == WM_NCCREATE) {
    auto window_struct = reinterpret_cast<CREATESTRUCT*>(lparam);
    SetWindowLongPtr(window, GWLP_USERDATA,
                     reinterpret_cast<LONG_PTR>(window_struct->lpCreateParams));

    auto that = static_cast<Win32Window*>(window_struct->lpCreateParams);
    EnableFullDpiSupportIfAvailable(window);
    that->window_handle_ = window;
  } else if (Win32Window* that = GetThisFromHandle(window)) {
    return that->MessageHandler(window, message, wparam, lparam);
  }

  return DefWindowProc(window, message, wparam, lparam);
}

LRESULT
Win32Window::MessageHandler(HWND hwnd,
                            UINT const message,
                            WPARAM const wparam,
                            LPARAM const lparam) noexcept {
  switch (message) {
    case WM_DESTROY:
      window_handle_ = nullptr;
      Destroy();
      if (quit_on_close_) {
        PostQuitMessage(0);
      }
      return 0;

    case WM_DPICHANGED: {
      auto newRectSize = reinterpret_cast<RECT*>(lparam);
      LONG newWidth = newRectSize->right - newRectSize->left;
      LONG newHeight = newRectSize->bottom - newRectSize->top;

      SetWindowPos(hwnd, nullptr, newRectSize->left, newRectSize->top, newWidth,
                   newHeight, SWP_NOZORDER | SWP_NOACTIVATE);

      return 0;
    }
    case WM_GETMINMAXINFO: {
      MINMAXINFO* mmi = reinterpret_cast<MINMAXINFO*>(lparam);
      UINT dpi = GetWindowDpi(hwnd);
      double scale = dpi / 96.0;
      DWORD style = static_cast<DWORD>(GetWindowLongPtr(hwnd, GWL_STYLE));
      DWORD ex_style = static_cast<DWORD>(GetWindowLongPtr(hwnd, GWL_EXSTYLE));
      // Min phone client width: 300 dp, scaled with locked 19.5:9 aspect ratio
      RECT min_rect = {0, 0, Scale(300, scale), Scale(static_cast<int>(300 * (892.0 / 412.0)), scale)};
      AdjustWindowRectForDpi(&min_rect, style, FALSE, ex_style, dpi);
      mmi->ptMinTrackSize.x = min_rect.right - min_rect.left;
      mmi->ptMinTrackSize.y = min_rect.bottom - min_rect.top;
      return 0;
    }

    case WM_SIZING: {
      RECT* rect = reinterpret_cast<RECT*>(lparam);
      RECT client_rect;
      GetClientRect(hwnd, &client_rect);
      RECT win_rect;
      GetWindowRect(hwnd, &win_rect);

      int border_w = (win_rect.right - win_rect.left) - (client_rect.right - client_rect.left);
      int border_h = (win_rect.bottom - win_rect.top) - (client_rect.bottom - client_rect.top);

      const double aspect_ratio = 412.0 / 892.0;       // width / height
      const double inv_aspect_ratio = 892.0 / 412.0;   // height / width

      int current_client_w = (rect->right - rect->left) - border_w;
      int current_client_h = (rect->bottom - rect->top) - border_h;

      switch (wparam) {
        case WMSZ_LEFT:
        case WMSZ_RIGHT: {
          int new_client_h = static_cast<int>(current_client_w * inv_aspect_ratio + 0.5);
          rect->bottom = rect->top + new_client_h + border_h;
          break;
        }
        case WMSZ_TOP:
        case WMSZ_BOTTOM: {
          int new_client_w = static_cast<int>(current_client_h * aspect_ratio + 0.5);
          rect->right = rect->left + new_client_w + border_w;
          break;
        }
        case WMSZ_TOPLEFT: {
          int new_client_w = static_cast<int>(current_client_h * aspect_ratio + 0.5);
          rect->left = rect->right - (new_client_w + border_w);
          break;
        }
        case WMSZ_TOPRIGHT: {
          int new_client_w = static_cast<int>(current_client_h * aspect_ratio + 0.5);
          rect->right = rect->left + new_client_w + border_w;
          break;
        }
        case WMSZ_BOTTOMLEFT: {
          int new_client_w = static_cast<int>(current_client_h * aspect_ratio + 0.5);
          rect->left = rect->right - (new_client_w + border_w);
          break;
        }
        case WMSZ_BOTTOMRIGHT: {
          int new_client_w = static_cast<int>(current_client_h * aspect_ratio + 0.5);
          rect->right = rect->left + new_client_w + border_w;
          break;
        }
      }
      return TRUE;
    }
    case WM_SIZE: {
      RECT rect = GetClientArea();
      if (child_content_ != nullptr) {
        // Size and position the child window.
        MoveWindow(child_content_, rect.left, rect.top, rect.right - rect.left,
                   rect.bottom - rect.top, TRUE);
      }
      return 0;
    }

    case WM_ACTIVATE:
      if (child_content_ != nullptr) {
        SetFocus(child_content_);
      }
      return 0;

    case WM_DWMCOLORIZATIONCOLORCHANGED:
      UpdateTheme(hwnd);
      return 0;
  }

  return DefWindowProc(window_handle_, message, wparam, lparam);
}

void Win32Window::Destroy() {
  OnDestroy();

  if (window_handle_) {
    DestroyWindow(window_handle_);
    window_handle_ = nullptr;
  }
  if (g_active_window_count == 0) {
    WindowClassRegistrar::GetInstance()->UnregisterWindowClass();
  }
}

Win32Window* Win32Window::GetThisFromHandle(HWND const window) noexcept {
  return reinterpret_cast<Win32Window*>(
      GetWindowLongPtr(window, GWLP_USERDATA));
}

void Win32Window::SetChildContent(HWND content) {
  child_content_ = content;
  SetParent(content, window_handle_);
  RECT frame = GetClientArea();

  MoveWindow(content, frame.left, frame.top, frame.right - frame.left,
             frame.bottom - frame.top, true);

  SetFocus(child_content_);
}

RECT Win32Window::GetClientArea() {
  RECT frame;
  GetClientRect(window_handle_, &frame);
  return frame;
}

HWND Win32Window::GetHandle() {
  return window_handle_;
}

void Win32Window::SetQuitOnClose(bool quit_on_close) {
  quit_on_close_ = quit_on_close;
}

bool Win32Window::OnCreate() {
  // No-op; provided for subclasses.
  return true;
}

void Win32Window::OnDestroy() {
  // No-op; provided for subclasses.
}

void Win32Window::UpdateTheme(HWND const window) {
  DWORD light_mode;
  DWORD light_mode_size = sizeof(light_mode);
  LSTATUS result = RegGetValue(HKEY_CURRENT_USER, kGetPreferredBrightnessRegKey,
                               kGetPreferredBrightnessRegValue,
                               RRF_RT_REG_DWORD, nullptr, &light_mode,
                               &light_mode_size);

  if (result == ERROR_SUCCESS) {
    BOOL enable_dark_mode = light_mode == 0;
    DwmSetWindowAttribute(window, DWMWA_USE_IMMERSIVE_DARK_MODE,
                          &enable_dark_mode, sizeof(enable_dark_mode));
  }
}
