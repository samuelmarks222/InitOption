const FIRST_NAMES = [
  "James","Mary","John","Patricia","Robert","Jennifer","Michael","Linda","David","Elizabeth",
  "William","Barbara","Richard","Susan","Joseph","Jessica","Thomas","Sarah","Christopher","Karen",
  "Charles","Lisa","Daniel","Nancy","Matthew","Betty","Anthony","Margaret","Mark","Sandra",
  "Donald","Ashley","Steven","Dorothy","Paul","Kimberly","Andrew","Emily","Joshua","Donna",
  "Kenneth","Michelle","Kevin","Carol","Brian","Amanda","George","Melissa","Timothy","Deborah",
  "Ronald","Stephanie","Edward","Rebecca","Jason","Sharon","Jeffrey","Laura","Ryan","Cynthia",
  "Jacob","Kathleen","Gary","Amy","Nicholas","Angela","Eric","Shirley","Jonathan","Anna",
  "Stephen","Brenda","Larry","Pamela","Justin","Emma","Scott","Nicole","Brandon","Helen",
  "Benjamin","Samantha","Samuel","Katherine","Raymond","Christine","Gregory","Debra","Frank",
  "Rachel","Alexander","Carolyn","Patrick","Janet","Jack","Catherine","Dennis","Maria",
  "Jeremy","Heather","Ahmed","Fatima","Omar","Aisha","Kwame","Zara","Chen","Maria",
  "Carlos","Priya","Yusuf","Lindiwe","Chloe","David","Sofia","Hassan","Naledi","Rajesh",
  "Amina","Thomas","Leila","Kofi","Yuki","Isabela","Ali","Mei","Ravi","Ingrid",
  "Bjorn","Olga","Dmitri","Sachiko","Wei","Jong","Ananya","Mohammed","Hiroshi","Elena",
];

const LAST_NAMES = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez",
  "Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin",
  "Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson",
  "Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores",
  "Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter","Roberts",
  "Gomez","Phillips","Evans","Turner","Diaz","Parker","Cruz","Edwards","Collins","Reyes",
  "Stewart","Morris","Morales","Murphy","Cook","Rogers","Gutierrez","Ortiz","Morgan","Cooper",
  "Peterson","Bailey","Reed","Kelly","Howard","Ramos","Kim","Cox","Ward","Richardson",
  "Watson","Brooks","Chavez","Wood","James","Bennett","Gray","Mendoza","Ruiz","Hughes",
  "Price","Alvarez","Castillo","Sanders","Patel","Myers","Long","Ross","Foster","Jimenez",
  "Hassan","Okafor","Asante","Patel","Santos","Rodriguez","Sharma","Ali","Dlamini","Ben Salah",
  "Martin","Kimani","Rossi","Mahmoud","Moyo","Kumar","Yusuf","Mueller","Haddad","Annan",
  "Tanaka","Silva","Chen","Wang","Kim","Singh","Ivanov","Petrov","Volkov","Fischer",
];

const COUNTRIES = [
  "US","GB","CA","AU","DE","FR","IT","ES","NL","SE","NO","DK","FI","BR","AR","MX",
  "CO","CL","ZA","NG","KE","GH","EG","MA","TN","AE","SA","IN","PK","BD","JP","KR",
  "CN","TH","VN","MY","SG","RU","TR","PL","CZ","HU","RO","UA","GR","PT","IE","CH",
  "AT","BE","IL","PH","ID","NZ","PE","VE",
];

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1103515245, s) + 12345) >>> 0;
    return (s & 0x7fffffff) / 0x7fffffff;
  };
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

export function getDummyTraders(count: number, excludeUserIds: string[] = [], seed?: string) {
  const seedNum = seed ? hashCode(seed) : Date.now();
  const rng = seededRandom(seedNum);
  const excludeSet = new Set(excludeUserIds);
  const result: { name: string; country: string; avatar: string }[] = [];
  let idx = 0;

  while (result.length < count) {
    const firstName = FIRST_NAMES[idx % FIRST_NAMES.length];
    const lastName = LAST_NAMES[Math.floor(idx / FIRST_NAMES.length) % LAST_NAMES.length];
    const name = `${firstName} ${lastName}`;
    const country = COUNTRIES[Math.floor(rng() * COUNTRIES.length)];
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=dummy-${seedNum}-${idx}`;
    const dummyId = `dummy-${seedNum}-${idx}`;

    if (!excludeSet.has(dummyId)) {
      result.push({ name, country, avatar });
    }
    idx++;
  }

  return result;
}
