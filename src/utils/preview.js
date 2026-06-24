export const FILE_TYPES = [
  { value: "html", label: "HTML", extension: ".html" },
  { value: "css", label: "CSS", extension: ".css" },
  { value: "javascript", label: "JavaScript", extension: ".js" },
  { value: "json", label: "JSON", extension: ".json" },
  { value: "txt", label: "TXT", extension: ".txt" },
];

export const languageFromName = (name) => {
  const normalized = name.trim().toLowerCase();
  if (normalized.endsWith(".html")) return "html";
  if (normalized.endsWith(".css")) return "css";
  if (normalized.endsWith(".js")) return "javascript";
  if (normalized.endsWith(".json")) return "json";
  if (normalized.endsWith(".txt")) return "txt";
  return "txt";
};

export const extensionForLanguage = (language) => {
  return FILE_TYPES.find((type) => type.value === language)?.extension || ".txt";
};

export const labelForLanguage = (language) => {
  return FILE_TYPES.find((type) => type.value === language)?.label || "TXT";
};

export const normalizeFileName = (name, language) => {
  const baseName = name.trim().replace(/\s+/g, "-");
  const extension = extensionForLanguage(language);
  return baseName.toLowerCase().endsWith(extension) ? baseName : `${baseName}${extension}`;
};

export const validateFileName = (name, language, files, currentFileId = null) => {
  const normalized = normalizeFileName(name, language);

  if (!name.trim()) {
    return { fileName: normalized, error: "Enter a file name." };
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(normalized)) {
    return { fileName: normalized, error: "Use only letters, numbers, dots, dashes, and underscores." };
  }

  if (normalized.startsWith(".") || normalized.includes("..")) {
    return { fileName: normalized, error: "Use a valid file name." };
  }

  const duplicate = files.some(
    (file) => file.id !== currentFileId && file.name.toLowerCase() === normalized.toLowerCase(),
  );

  if (duplicate) {
    return { fileName: normalized, error: "A file with that name already exists." };
  }

  return { fileName: normalized, error: "" };
};

export const buildPreviewDocument = (files) => {
  const html = files.find((file) => file.language === "html")?.content || "";
  const css = files
    .filter((file) => file.language === "css")
    .map((file) => file.content)
    .join("\n");
  const js = files
    .filter((file) => file.language === "javascript")
    .map((file) => file.content)
    .join("\n");

  return `<!doctype html>
<html>
  <head>
    <style>${css}</style>
  </head>
  <body>
    ${html}
    <script>${js}<\/script>
  </body>
</html>`;
};
