import { hash } from "bcryptjs";

async function main() {
  const h = await hash("admin123", 10);
  console.log(h);
}
main();
