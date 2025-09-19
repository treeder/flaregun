// https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/
export async function scheduled(c) {
  console.log(c.controller.cron, c.controller.type, c.controller.scheduledTime)
  // ctx.waitUntil(doSomeTaskOnASchedule());
}
