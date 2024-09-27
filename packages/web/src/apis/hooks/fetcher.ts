async function fetcher<T>(...args: Parameters<typeof fetch>): Promise<T> {
  return fetch(...args).then((res) => res.json()) as Promise<T>;
}

export default fetcher;
