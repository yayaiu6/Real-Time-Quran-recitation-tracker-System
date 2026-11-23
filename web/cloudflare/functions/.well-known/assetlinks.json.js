export async function onRequest() {
  const assetLinks = [
    {
      "relation": ["delegate_permission/common.handle_all_urls"],
      "target": {
        "namespace": "android_app",
        "package_name": "com.recitequran.app",
        "sha256_cert_fingerprints": [
          "FD:BA:A9:94:02:D4:89:DA:A5:E9:0B:EB:E7:FC:CE:D1:01:67:DE:19:46:35:2A:E3:52:B5:A0:98:64:CA:F2:69",
          "75:72:47:77:42:16:3D:8F:CA:F6:CF:FC:D5:6A:E8:A4:60:0E:C4:34:DB:C3:DA:6C:3A:4E:D9:D3:6B:1F:39:C6"
        ]
      }
    }
  ];

  return new Response(JSON.stringify(assetLinks), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400"
    }
  });
}

