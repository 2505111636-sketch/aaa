import { db } from './session';
let seeding: Promise<void> | undefined;
export async function seed() {
  if (!seeding)
    seeding = db()
      .batch([
        db()
          .prepare("INSERT OR IGNORE INTO facilities VALUES ('A-E2','A','2号电梯','fault',?)")
          .bind(Date.now()),
        db()
          .prepare("INSERT OR IGNORE INTO facilities VALUES ('B-E1','B','1号电梯','healthy',?)")
          .bind(Date.now()),
        db()
          .prepare("INSERT OR IGNORE INTO facilities VALUES ('C-R1','C','无障碍坡道','healthy',?)")
          .bind(Date.now()),
      ])
      .then(() => {})
      .catch((error) => {
        seeding = undefined;
        throw error;
      });
  await seeding;
}
