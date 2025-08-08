export async function onRequest(c) {
  c.data.d1 = new D1(c.env.D1)
}