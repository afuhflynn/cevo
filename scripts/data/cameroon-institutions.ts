/**
 * Verified Cameroonian higher-education directory.
 *
 * Sources (retrieved November 2026 via Firecrawl): Wikipedia
 * "List of universities in Cameroon" for the institution roster, plus the
 * individual university pages for faculty/school structure, cross-checked
 * against official sites where pages were stubs (CUIB schools from
 * cuib-cameroon.org; PKFokam programs from kfokaminstitute.com;
 * UY2 units from site.univ-yaounde2.org/WHED).
 *
 * Rules followed while compiling:
 * - every institution is real and currently recognised;
 * - a faculty/school is listed only if a source names it for that school;
 * - departments are listed only when a source enumerates them (otherwise
 *   students use the in-app "type the name" fallback, which the step saves
 *   directly — no fabricated links anywhere).
 */

export type SeedProgramme = {
  name: string;
  qualification:
    | "HND"
    | "BACHELORS"
    | "MASTERS"
    | "PHD"
    | "OTHER";
  years: number;
};

export type SeedDepartment = {
  name: string;
  programmes: SeedProgramme[];
};

export type SeedFaculty = {
  name: string;
  departments: SeedDepartment[];
};

export type SeedInstitution = {
  name: string;
  code: string;
  city?: string;
  faculties: SeedFaculty[];
};

const dept = (name: string): SeedDepartment => ({ name, programmes: [] });
const fac = (name: string, departments: SeedDepartment[] = []): SeedFaculty => ({
  name,
  departments,
});

export const DATA: SeedInstitution[] = [
  // ---------------------------------------------------------- PUBLIC
  {
    name: "University of Bamenda",
    code: "UBa",
    city: "Bamenda",
    faculties: [
      fac("Faculty of Arts"),
      fac("Faculty of Law and Political Science", [
        dept("English Private Law"),
        dept("Public Law"),
        dept("Political Science"),
        dept("French Private Law"),
      ]),
      fac("Faculty of Economics and Management Sciences"),
      fac("Faculty of Education"),
      fac("Faculty of Science"),
      fac("Faculty of Health Sciences"),
      fac("College of Technology"),
      fac("Higher Institute of Commerce and Management"),
      fac("Higher Institute of Transport and Logistics"),
      fac("Higher Teachers Training College"),
      fac("Higher Technical Teachers Training College"),
      fac("National Higher Polytechnic Institute"),
    ],
  },
  {
    name: "University of Bertoua",
    code: "UBer",
    city: "Bertoua",
    faculties: [],
  },
  {
    name: "University of Buea",
    code: "UB",
    city: "Buea",
    faculties: [
      fac("Faculty of Engineering and Technology"),
      fac("Faculty of Arts"),
      fac("Faculty of Education"),
      fac("Faculty of Health Sciences"),
      fac("Faculty of Science"),
      fac("Faculty of Social and Management Sciences"),
      fac("Faculty of Agriculture and Veterinary Medicine"),
      fac("Faculty of Laws and Political Science"),
      fac("Advanced School of Translators and Interpreters"),
      fac("College of Technology"),
      fac("Higher Technical Teachers Training College"),
      fac("Higher Teachers Training College"),
    ],
  },
  {
    name: "University of Douala",
    code: "UDla",
    city: "Douala",
    faculties: [
      fac("Faculty of Science"),
      fac("Faculty of Law and Political Science"),
      fac("Faculty of Letters and Human Sciences"),
      fac("Faculty of Economics and Applied Management"),
      fac("Faculty of Medicine and Pharmaceutical Sciences"),
      fac("University Institute of Technology"),
      fac("Institute of Fisheries Sciences"),
      fac("Institute of Fine Arts"),
      fac("Internet Academy"),
      fac("Advanced School of Economics and Commerce"),
      fac("National Advanced School of Engineering"),
      fac("National Polytechnic School"),
    ],
  },
  {
    name: "University of Dschang",
    code: "UDsc",
    city: "Dschang",
    faculties: [
      fac("Faculty of Letters and Human Sciences"),
      fac("Faculty of Economics and Management"),
      fac("Faculty of Law and Political Science"),
      fac("Faculty of Science"),
      fac("Faculty of Agronomy and Agricultural Sciences"),
      fac("Faculty of Medicine"),
      fac("Institute of Fine Arts of Foumban"),
      fac("University Institute of Technology Fotso Victor"),
    ],
  },
  {
    name: "University of Maroua",
    code: "UMar",
    city: "Maroua",
    faculties: [
      fac("Faculty of Economics and Management"),
      fac("Faculty of Science"),
      fac("Faculty of Arts, Letters and Social Sciences"),
      fac("Faculty of Mines and Petroleum Industries"),
      fac("Higher Teachers Training College"),
      fac("National Advanced School of Engineering"),
    ],
  },
  {
    name: "University of Ngaoundere",
    code: "UNga",
    city: "Ngaoundere",
    faculties: [
      fac("Faculty of Arts, Letters and Human Sciences", [
        dept("English"),
        dept("Anthropology and Sociology"),
        dept("Arts"),
        dept("French"),
        dept("Geography"),
        dept("History"),
        dept("Arabic Language and Civilization"),
        dept("Linguistics and African Languages"),
      ]),
      fac("Faculty of Science", [
        dept("Physics"),
        dept("Mathematics and Computer Science"),
        dept("Biological Sciences"),
        dept("Earth Sciences"),
        dept("Chemistry"),
        dept("Environmental Sciences"),
        dept("Health Sciences and Biomedical Sciences"),
        dept("Sciences and Techniques of Organic Agriculture"),
        dept("Renewable Energy"),
      ]),
      fac("Faculty of Economic Science and Management", [
        dept("Accountancy and Finance"),
        dept("Management, Strategy and Forecasting"),
        dept("Marketing"),
        dept("Monetary and Banking Economics"),
      ]),
      fac("Faculty of Law and Political Science"),
    ],
  },
  {
    name: "University of Yaounde I",
    code: "UY1",
    city: "Yaounde",
    faculties: [
      fac("Faculty of Arts, Letters and Social Sciences"),
      fac("Faculty of Science"),
      fac("Faculty of Medicine and Biomedical Sciences"),
      fac("Higher Teachers Training College"),
      fac("National Advanced School of Engineering"),
      fac("Higher Technical Teachers Training College"),
    ],
  },
  {
    name: "University of Yaounde II",
    code: "UY2",
    city: "Soa",
    faculties: [
      fac("Faculty of Law and Political Science"),
      fac("Faculty of Economics and Management"),
      fac("Advanced School of Mass Communication"),
      fac("International Relations Institute of Cameroon"),
      fac("Institute of Demographic Training and Research"),
    ],
  },
  {
    name: "University of Ebolowa",
    code: "UEbo",
    city: "Ebolowa",
    faculties: [],
  },
  {
    name: "University of Garoua",
    code: "UGar",
    city: "Garoua",
    faculties: [],
  },
  // ---------------------------------------------------------- PRIVATE
  {
    name: "Catholic University of Cameroon, Bamenda",
    code: "CATUC",
    city: "Bamenda",
    faculties: [
      fac("Faculty of Theology"),
      fac("Faculty of Philosophy"),
      fac("School of Law"),
      fac("School of Health Sciences"),
      fac("Faculty of Education"),
      fac("Faculty of Economics and Management Sciences"),
    ],
  },
  {
    name: "Catholic University of Central Africa",
    code: "UCAC",
    city: "Yaounde",
    faculties: [
      fac("Faculty of Theology"),
      fac("Faculty of Philosophy"),
      fac("Faculty of Social Sciences and Management"),
      fac("Canon Law Department"),
      fac("Advanced School of Nursing"),
      fac("School of Engineering and Technology"),
      fac("School of Health Sciences"),
    ],
  },
  {
    name: "Universite des Montagnes",
    code: "UdM",
    city: "Bangangte",
    faculties: [
      fac("Faculty of Health Sciences", [
        dept("Medicine"),
        dept("Pharmacy"),
        dept("Dental Surgery"),
        dept("Veterinary Medicine"),
        dept("Nursing"),
      ]),
      fac("Faculty of Science and Technology", [
        dept("Computer Science and Networking"),
        dept("Telecommunications Networks"),
        dept("Biomedical Engineering"),
        dept("Applied Mathematics"),
      ]),
      fac("Faculty of Agriculture and Environment", [
        dept("Agroforestry"),
        dept("Agronomy"),
        dept("Environment and Climate Change"),
        dept("Renewable Energy"),
      ]),
    ],
  },
  {
    name: "ICT University",
    code: "ICTU",
    city: "Yaounde",
    faculties: [
      fac("School of Information and Communication Technology"),
      fac("School of Business and Management"),
      fac("School of Health Sciences"),
    ],
  },
  {
    name: "Catholic University Institute of Buea",
    code: "CUIB",
    city: "Buea",
    faculties: [
      fac("School of Agriculture and Natural Resources"),
      fac("School of Business"),
      fac("School of Engineering"),
      fac("School of Information Technology"),
      fac("School of Catholic Studies"),
    ],
  },
  {
    name: "PKFokam Institute of Excellence",
    code: "PKF",
    city: "Yaounde",
    faculties: [
      fac("School of Engineering"),
      fac("School of Economics and Management"),
      fac("School of Business Administration"),
    ],
  },
  {
    name: "Saint Monica University",
    code: "SMU",
    faculties: [],
  },
  {
    name: "Cosendai Adventist University",
    code: "CAU",
    city: "Nanga Eboko",
    faculties: [],
  },
  {
    name: "International University, Bamenda",
    code: "IUB",
    city: "Bamenda",
    faculties: [],
  },
  {
    name: "Biaka University Institute of Buea",
    code: "BUIB",
    city: "Buea",
    faculties: [],
  },
  {
    name: "HIBMAT University Institute",
    code: "HUIB",
    city: "Buea",
    faculties: [],
  },
  {
    name: "National Polytechnic University Institute Bamenda",
    code: "NPUIB",
    city: "Bamenda",
    faculties: [],
  },
  {
    name: "Institut Universitaire du Golfe de Guinee",
    code: "IUG",
    city: "Douala",
    faculties: [],
  },
  {
    name: "Siantou University Institute",
    code: "SIU",
    city: "Yaounde",
    faculties: [],
  },
  {
    name: "National Advanced School of Public Works",
    code: "ENSTP",
    city: "Yaounde",
    faculties: [],
  },
  {
    name: "Meridian University",
    code: "MERID",
    city: "Kumbo",
    faculties: [],
  },
  {
    name: "Kesmonds International University",
    code: "KESM",
    faculties: [],
  },
  {
    name: "Taniform University",
    code: "TANIF",
    city: "Bamenda",
    faculties: [],
  },
  {
    name: "ISSAB University",
    code: "ISSAB",
    faculties: [],
  },
  {
    name: "Maflekumen Higher Institute of Health Sciences",
    code: "MAFLE",
    faculties: [],
  },
  {
    name: "HIPDET University",
    code: "HIPDET",
    city: "Bamenda",
    faculties: [],
  },
  {
    name: "SwissLink Higher Institute of Business and Technology",
    code: "SWISS",
    faculties: [],
  },
  {
    name: "Institut Agenla Academy",
    code: "AGENLA",
    faculties: [],
  },
  {
    name: "Enieg Oxford University Institute",
    code: "ENIEGOXF",
    city: "Douala",
    faculties: [],
  },
  {
    name: "St. Lawrence University",
    code: "STLAW",
    faculties: [],
  },
  {
    name: "Yaounde International Business School",
    code: "YIBS",
    city: "Yaounde",
    faculties: [],
  },
  {
    name: "Fomic Polytechnic University",
    code: "FOMPOL",
    faculties: [],
  },
  {
    name: "Technical University Cameroon",
    code: "TECHCAM",
    city: "Buea",
    faculties: [],
  },
  {
    name: "STEM University Institute",
    code: "STEMIU",
    faculties: [],
  },
  {
    name: "Pan African Institute for Development - West Africa",
    code: "PAIDWA",
    city: "Buea",
    faculties: [],
  },
  {
    name: "Central University Institute Bamenda",
    code: "CUIBa",
    city: "Bamenda",
    faculties: [],
  },
];
