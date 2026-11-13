import "dotenv/config";
import { db } from "../lib/prisma";

const DATA = [
  {
    name: "University of Yaounde I",
    code: "UY1",
    city: "Yaounde",
    faculties: [
      {
        name: "Faculty of Science",
        departments: [
          {
            name: "Computer Science",
            programmes: [
              {
                name: "BSc Computer Science",
                qualification: "BACHELORS" as const,
                years: 3,
              },
            ],
          },
          {
            name: "Mathematics",
            programmes: [
              {
                name: "BSc Mathematics",
                qualification: "BACHELORS" as const,
                years: 3,
              },
            ],
          },
        ],
      },
      {
        name: "Faculty of Arts, Letters and Social Sciences",
        departments: [
          {
            name: "English",
            programmes: [
              {
                name: "BA English",
                qualification: "BACHELORS" as const,
                years: 3,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "University of Buea",
    code: "UB",
    city: "Buea",
    faculties: [
      {
        name: "Faculty of Engineering and Technology",
        departments: [
          {
            name: "Computer Engineering",
            programmes: [
              {
                name: "BEng Computer Engineering",
                qualification: "BACHELORS" as const,
                years: 4,
              },
            ],
          },
          {
            name: "Electrical Engineering",
            programmes: [
              {
                name: "BEng Electrical Engineering",
                qualification: "BACHELORS" as const,
                years: 4,
              },
            ],
          },
        ],
      },
      {
        name: "Faculty of Science",
        departments: [
          {
            name: "Biochemistry",
            programmes: [
              {
                name: "BSc Biochemistry",
                qualification: "BACHELORS" as const,
                years: 3,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "University of Douala",
    code: "UD",
    city: "Douala",
    faculties: [
      {
        name: "Faculty of Economics and Applied Management",
        departments: [
          {
            name: "Management",
            programmes: [
              {
                name: "BSc Management",
                qualification: "BACHELORS" as const,
                years: 3,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "University of Bamenda",
    code: "UBa",
    city: "Bamenda",
    faculties: [
      {
        name: "Faculty of Health Sciences",
        departments: [
          {
            name: "Nursing",
            programmes: [
              {
                name: "BSc Nursing",
                qualification: "BACHELORS" as const,
                years: 4,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Catholic University of Cameroon",
    code: "CATUC",
    city: "Bamenda",
    faculties: [
      {
        name: "School of Engineering",
        departments: [
          {
            name: "Software Engineering",
            programmes: [
              {
                name: "BEng Software Engineering",
                qualification: "BACHELORS" as const,
                years: 4,
              },
            ],
          },
        ],
      },
    ],
  },
];

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
