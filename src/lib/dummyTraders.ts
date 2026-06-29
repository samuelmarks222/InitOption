export const DUMMY_TRADERS = [
  { name: "Ahmed Hassan", country: "EG", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ahmed" },
  { name: "Fatima Al-Zahra", country: "SA", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=fatima" },
  { name: "James Okafor", country: "NG", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=james" },
  { name: "Aisha Mohammed", country: "KE", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=aisha" },
  { name: "Kwame Asante", country: "GH", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=kwame" },
  { name: "Zara Patel", country: "IN", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=zara" },
  { name: "Chen Wei", country: "CN", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=chen" },
  { name: "Maria Santos", country: "BR", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=maria" },
  { name: "Carlos Rodriguez", country: "MX", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=carlos" },
  { name: "Priya Sharma", country: "IN", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=priya" },
  { name: "Yusuf Ali", country: "AE", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=yusuf" },
  { name: "Lindiwe Dlamini", country: "ZA", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=lindiwe" },
  { name: "Omar Ben Salah", country: "TN", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=omar" },
  { name: "Chloe Martin", country: "FR", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=chloe" },
  { name: "David Kimani", country: "KE", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=david" },
  { name: "Sofia Rossi", country: "IT", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sofia" },
  { name: "Hassan Mahmoud", country: "EG", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=hassan" },
  { name: "Naledi Moyo", country: "ZW", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=naledi" },
  { name: "Rajesh Kumar", country: "IN", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=rajesh" },
  { name: "Amina Yusuf", country: "NG", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=amina" },
  { name: "Thomas Mueller", country: "DE", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=thomas" },
  { name: "Leila Haddad", country: "LB", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=leila" },
  { name: "Kofi Annan", country: "GH", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=kofi" },
  { name: "Yuki Tanaka", country: "JP", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=yuki" },
  { name: "Isabela Silva", country: "BR", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=isabela" },
];

export function getDummyTraders(count: number, excludeUserIds: string[] = []) {
  const shuffled = [...DUMMY_TRADERS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}