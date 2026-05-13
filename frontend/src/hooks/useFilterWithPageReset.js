export default function useFilterWithPageReset(setPage) {
  return (setter) => (value) => {
    setter(value);
    setPage(0);
  };
}
