// Données fictives de la démo publique (reprises du prototype UROSI T MVP).
// Rien ici ne touche Supabase : la démo est 100 % locale.

export interface DemoMission {
  id: number;
  pay: number;
  solid?: boolean;
  t: string;
  struct: string;
  adr: string;
  d: number;
  desc: string;
  sNote: number | null;
  sNb: number;
  verif: boolean;
}

export const FLUX0: DemoMission[] = [
  { id: 1, pay: 42, t: 'Renfort service midi', struct: 'Burger Nord', adr: '12 Rue de Béthune, Lille', d: 0.3, desc: 'Rush 12h–15h, aide au comptoir.', sNote: 4.7, sNb: 38, verif: true },
  { id: 2, pay: 88, t: 'Runner événement', struct: 'Maison Event', adr: 'Salle Majestic, Lille', d: 1.4, desc: 'Logistique et coordination sur événement.', sNote: 4.9, sNb: 22, verif: true },
  { id: 5, pay: 0, solid: true, t: 'Distribution de colis alimentaires', struct: 'Banque Alimentaire', adr: 'Rue Nationale, Lille', d: 1.2, desc: "Préparation et distribution de colis aux familles. Mission solidaire : elle compte dans ton CV vivant comme preuve d'engagement, sans rémunération.", sNote: 4.8, sNb: 61, verif: true },
  { id: 3, pay: 120, t: 'Inventaire sneakers', struct: 'SneakRoom', adr: 'Centre Euralille', d: 1.9, desc: 'Inventaire de produits haute valeur.', sNote: 4.9, sNb: 14, verif: true },
  { id: 6, pay: 0, solid: true, t: 'Aide maraude du soir', struct: 'Secours Populaire', adr: 'Wazemmes, Lille', d: 2.0, desc: 'Distribution de repas chauds en soirée. Bénévolat comptabilisé dans ton CV vivant.', sNote: 4.9, sNb: 44, verif: true },
  { id: 4, pay: 55, t: 'Aide installation', struct: 'Traiteur Halluin', adr: 'Rue de Lille, Halluin', d: 2.2, desc: 'Montage et mise en place de salle.', sNote: null, sNb: 0, verif: true },
];

export interface DemoHist {
  t: string;
  s: string;
  note: number;
  dt: string;
  pay: number;
}

export const HIST0: DemoHist[] = [
  { t: 'Renfort fast-food', s: 'Burger Nord', note: 4, dt: '25/03', pay: 40 },
  { t: 'Aide installation', s: 'Salle M', note: 5, dt: '18/03', pay: 55 },
  { t: 'Préparation mariage', s: 'Maison Event', note: 5, dt: '10/03', pay: 70 },
];

export const MOTIFS: Record<string, string> = {
  absent: 'Structure absente / pas au rendez-vous',
  conditions: "Conditions différentes de l'annonce",
  securite: 'Sécurité / situation dangereuse',
  autre: 'Autre',
};

export interface DemoStructInfo {
  type: string;
  ess: boolean;
  hue: number;
  verif: boolean;
  note: number | null;
  avis: number;
  siret: string;
  adr: string;
  metro: string;
  horaires: string;
  pubs: number;
  presence: number | null;
  repw: string | null;
  apropos: string;
  avisList: [string, string, number, string][];
}

export const SINFO: Record<string, DemoStructInfo> = {
  'Burger Nord': { type: 'PME · Restauration rapide', ess: false, hue: 18, verif: true, note: 4.7, avis: 38, siret: '852 123 456 00018', adr: '12 Rue de Béthune, 59000 Lille', metro: 'Métro République Beaux-Arts (350 m)', horaires: 'Ouvert tous les jours de 11h à 23h', pubs: 215, presence: 98, repw: '6 min', apropos: 'Fast-food premium à Lille. Équipe jeune et dynamique, ambiance bienveillante.', avisList: [['Inès', 'Il y a 3 jours', 4.8, 'Équipe au top, mission claire et bonne ambiance !'], ['Karim', 'Il y a 1 sem.', 4.6, "Bien organisé, paiement rapide. J'y retourne."]] },
  'Maison Event': { type: 'Entreprise (SAS) · Événementiel', ess: false, hue: 265, verif: true, note: 4.9, avis: 22, siret: '790 456 123 00027', adr: 'Salle Majestic, 59800 Lille', metro: 'Métro Rihour (500 m)', horaires: 'Selon événements', pubs: 88, presence: 96, repw: '12 min', apropos: "Organisation d'événements et réceptions dans toute la métropole lilloise.", avisList: [['Sara', 'Il y a 5 jours', 5, 'Super équipe, mission bien cadrée.']] },
  SneakRoom: { type: 'PME · Commerce de détail', ess: false, hue: 200, verif: true, note: 4.9, avis: 14, siret: '902 778 231 00013', adr: 'Centre Euralille, 59777 Lille', metro: 'Gare Lille Europe (200 m)', horaires: '10h – 20h', pubs: 54, presence: 99, repw: '8 min', apropos: "Boutique de sneakers premium au cœur d'Euralille.", avisList: [['Alex', 'Il y a 1 sem.', 4.9, 'Mission carrée, staff sympa.']] },
  'Traiteur Halluin': { type: 'PME · Traiteur', ess: false, hue: 150, verif: true, note: null, avis: 0, siret: '913 002 447 00019', adr: 'Rue de Lille, 59250 Halluin', metro: 'Halluin centre (400 m)', horaires: 'Selon prestations', pubs: 2, presence: null, repw: null, apropos: 'Traiteur événementiel. Nouvelle structure sur UROSI.', avisList: [] },
  'Banque Alimentaire': { type: 'Association loi 1901 · ESS', ess: true, hue: 150, verif: true, note: 4.8, avis: 61, siret: '421 987 654 00021', adr: 'Rue Nationale, 59000 Lille', metro: 'Métro Gambetta (300 m)', horaires: 'Créneaux solidaires en semaine', pubs: 74, presence: 97, repw: '10 min', apropos: "Association d'aide alimentaire. Missions bénévoles pour préparer et distribuer des colis aux familles. Reconnue d'intérêt général (ESS).", avisList: [['Awa', 'Il y a 2 jours', 5, 'Équipe bénévole formidable, mission qui a du sens.'], ['Théo', 'Il y a 6 jours', 4.7, 'Très bien accueilli, ça compte dans mon CV vivant en plus.']] },
  'Secours Populaire': { type: 'Association loi 1901 · ESS', ess: true, hue: 350, verif: true, note: 4.9, avis: 44, siret: '775 663 210 00034', adr: 'Wazemmes, 59000 Lille', metro: 'Métro Gambetta (500 m)', horaires: 'Maraudes en soirée', pubs: 52, presence: 98, repw: '9 min', apropos: 'Association de solidarité. Maraudes et distributions de repas. Missions bénévoles ouvertes à tous (ESS).', avisList: [['Lucas', 'Il y a 4 jours', 5, 'Une belle expérience humaine.']] },
};

export interface DemoSMission {
  id: string;
  t: string;
  adr: string;
  pay: number;
  solid?: boolean;
  dt: string;
  desc: string;
  st: 'active' | 'draft' | 'pourvue';
}

export interface DemoCand {
  id: string;
  mid: string;
  nom: string;
  av: string;
  hue: number;
  note: number;
  nb: number;
  ville: string;
  dist: number;
  fois: number;
  dec: 'accepté' | 'refusé' | null;
  hist: [string, string][];
}

export interface DemoHabitue {
  nom: string;
  av: string;
  hue: number;
  fois: number;
  note: number;
  last: string;
}

export interface DemoSeed {
  mis: DemoSMission[];
  cands: DemoCand[];
  habitues: DemoHabitue[];
}

export const SEED: Record<'pme' | 'asso', DemoSeed> = {
  pme: {
    mis: [
      { id: 'm1', t: 'Renfort service midi', adr: '12 Rue de Béthune, Lille', pay: 42, dt: "Aujourd'hui · 12h", desc: "Rush du midi, aide au comptoir et à l'encaissement.", st: 'active' },
      { id: 'm2', t: 'Runner soirée', adr: 'Salle Majestic, Lille', pay: 60, dt: 'Sam 17 · 19h', desc: 'Coordination logistique en soirée, port de charges léger.', st: 'active' },
      { id: 'm3', t: 'Inventaire fin de mois', adr: 'Entrepôt, Lille', pay: 55, dt: 'Lun 26 · 8h', desc: 'Comptage et rangement des stocks.', st: 'draft' },
    ],
    cands: [
      { id: 'c1', mid: 'm1', nom: 'Yanis M.', av: 'Y', hue: 24, note: 4.6, nb: 18, ville: 'Lille', dist: 1.2, fois: 3, dec: null, hist: [['Renfort midi', '12/04'], ['Runner soir', '05/04']] },
      { id: 'c2', mid: 'm1', nom: 'Lina K.', av: 'L', hue: 265, note: 4.9, nb: 31, ville: 'Roubaix', dist: 2.8, fois: 2, dec: null, hist: [['Renfort soir', '02/04'], ['Accueil', '10/03']] },
      { id: 'c3', mid: 'm2', nom: 'Moussa D.', av: 'M', hue: 174, note: 4.1, nb: 9, ville: 'Tourcoing', dist: 3.5, fois: 0, dec: null, hist: [['Fast-food', '08/04']] },
    ],
    habitues: [
      { nom: 'Yanis M.', av: 'Y', hue: 24, fois: 3, note: 4.6, last: '12/04' },
      { nom: 'Lina K.', av: 'L', hue: 265, fois: 2, note: 4.9, last: '02/04' },
    ],
  },
  asso: {
    mis: [
      { id: 'a1', t: 'Distribution de colis alimentaires', adr: 'Rue Nationale, Lille', pay: 0, solid: true, dt: "Aujourd'hui · 14h", desc: 'Préparation et remise de colis aux familles.', st: 'active' },
      { id: 'a2', t: 'Tri des denrées', adr: 'Entrepôt, Lille', pay: 0, solid: true, dt: 'Demain · 9h', desc: 'Tri et rangement des dons alimentaires reçus.', st: 'active' },
      { id: 'a3', t: 'Maraude du soir', adr: 'Wazemmes, Lille', pay: 0, solid: true, dt: 'Ven · 20h', desc: 'Distribution de repas chauds aux personnes sans abri.', st: 'draft' },
    ],
    cands: [
      { id: 'b1', mid: 'a1', nom: 'Awa T.', av: 'A', hue: 150, note: 4.9, nb: 12, ville: 'Lille', dist: 0.9, fois: 4, dec: null, hist: [['Distribution colis', '11/04'], ['Tri denrées', '04/04']] },
      { id: 'b2', mid: 'a1', nom: 'Théo L.', av: 'T', hue: 210, note: 4.7, nb: 7, ville: 'Lambersart', dist: 2.1, fois: 1, dec: null, hist: [['Maraude', '06/04']] },
      { id: 'b3', mid: 'a2', nom: 'Fatou S.', av: 'F', hue: 320, note: 5, nb: 20, ville: 'Lille', dist: 1.5, fois: 5, dec: null, hist: [['Tri denrées', '09/04'], ['Distribution', '01/04']] },
    ],
    habitues: [
      { nom: 'Fatou S.', av: 'F', hue: 320, fois: 5, note: 5, last: '09/04' },
      { nom: 'Awa T.', av: 'A', hue: 150, fois: 4, note: 4.9, last: '11/04' },
    ],
  },
};
