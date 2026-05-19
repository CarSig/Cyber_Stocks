export default function useFilterWithPageReset(setPage: (v: number) => void) {
  return <T>(setter: (v: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(0);
    };
}
