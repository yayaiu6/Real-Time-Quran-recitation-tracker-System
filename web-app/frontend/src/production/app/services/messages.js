import { translationResources } from "./translation-resources.js";

function format(template, values) {
  return template.replace(/\{(\d+)\}/g, (_, index) => String(values[Number(index)]));
}

// Translation resources contain data only; formatting is handled separately.
export function createMessages(config) {
  const catalog = {};
  for (const language of ["ar", "en"]) {
    const { text, formats } = translationResources[language];
    const messages = {
      ...text,
      title: config.title[language],
      appName: config.name[language],
      companionPromo: config.companion.label[language],
      aboutLead: config.lead[language],
      install: { ...text.install, title: config.installTitle[language] },
    };
    for (const [key, template] of Object.entries(formats)) {
      messages[key] = Array.isArray(template)
        ? (count, plural) => format(template[plural ? 1 : 0], [count])
        : (...values) => format(template, values);
    }
    catalog[language] = messages;
  }
  return catalog;
}
