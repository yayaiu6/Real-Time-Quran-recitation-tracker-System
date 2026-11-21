// Idempotent writes keep MutationObserver-driven views from feeding themselves.
/** @param {Element | null} element @param {string} value */
export function text(element, value) {
  if (element && element.textContent !== value) element.textContent = value;
}

/** @param {Element | null} element @param {string} name @param {string | number | boolean} value */
export function attribute(element, name, value) {
  if (element && element.getAttribute(name) !== String(value)) element.setAttribute(name, String(value));
}

/** @param {Element | null} element @param {string} value */
export function classes(element, value) {
  if (element && element.className !== value) element.className = value;
}
