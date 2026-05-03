// Generate device fingerprint
export const generateDeviceFingerprint = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = "14px Arial";
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f60';
  ctx.fillRect(125, 1, 62, 20);
  ctx.fillStyle = '#069';
  ctx.fillText('Browser Fingerprint', 2, 15);

  const canvasFingerprint = canvas.toDataURL();

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    canvasFingerprint: canvasFingerprint.substring(0, 50),
    vendor: navigator.vendor,
    hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
  };
};

export default {
  generateDeviceFingerprint,
};
