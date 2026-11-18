import "dotenv/config";
import { db } from "../lib/prisma";
import { DATA } from "./data/cameroon-institutions";

async function main() {
  for (const inst of DATA) {
    let institution = await db.orm.public.Institution.where({
      code: inst.code,
    }).first();
    if (!institution) {
      institution = await db.orm.public.Institution.create({
        name: inst.name,
        code: inst.code,
        country: "Cameroon",
        city: inst.city,
        isVerified: true,
      });
    }
    for (const fac of inst.faculties) {
      let faculty = await db.orm.public.Faculty.where({
        institutionId: institution.id,
      })
        .where((r) => r.name.eq(fac.name))
        .first();
      if (!faculty) {
        faculty = await db.orm.public.Faculty.create({
          institutionId: institution.id,
          name: fac.name,
        });
      }
      for (const dep of fac.departments) {
        let department = await db.orm.public.Department.where({
          facultyId: faculty.id,
        })
          .where((r) => r.name.eq(dep.name))
          .first();
        if (!department) {
          department = await db.orm.public.Department.create({
            facultyId: faculty.id,
            name: dep.name,
          });
        }
        for (const prog of dep.programmes) {
          const existing = await db.orm.public.Programme.where({
            departmentId: department.id,
          })
            .where((r) => r.name.eq(prog.name))
            .first();
          if (!existing) {
            await db.orm.public.Programme.create({
              departmentId: department.id,
              name: prog.name,
              qualification: prog.qualification,
              durationYears: prog.years,
            });
          }
        }
      }
    }
  }
  console.log("Seeded Cameroonian institutions");
  await db.close();
}

main().catch(async (e) => {
  console.error(e);
  await db.close();
  process.exit(1);
});
