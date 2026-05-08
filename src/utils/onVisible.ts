export function onVisible<TE extends Element>(
  element: TE,
  callback: (element: TE) => void,
) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        callback(element);
        break;
      }
    }
  });

  observer.observe(element);
  return () => observer.disconnect();
}
