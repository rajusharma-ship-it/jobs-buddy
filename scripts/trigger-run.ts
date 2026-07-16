async function main() {
  const res = await fetch("http://127.0.0.1:3001/api/run", { method: "POST" });
  const data = await res.json();
  console.log(data);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
