export function useLocalStorage<T>(
  key: string,
): [get: () => T | undefined, set: (value: T) => void];
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [get: () => T, set: (value: T) => void];
export function useLocalStorage<T>(key: string, defaultValue?: T) {
  const get = () => {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  };

  const set = (value: T): void => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  return [get, set] as const;
}
