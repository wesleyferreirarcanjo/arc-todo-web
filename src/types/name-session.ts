export type Availability = 'available' | 'taken' | 'unknown';
export type CandidateSource = 'human' | 'chatbot' | 'mcp';
export type CandidateStatus =
  | 'active'
  | 'rejected'
  | 'recommended'
  | 'runner_up';
export type NamingGoal =
  | 'public_product'
  | 'company'
  | 'feature'
  | 'api'
  | 'internal_codename'
  | 'campaign';
export type BrandResult = 'clear' | 'collision' | 'unknown';
export type HistoryStatus = 'history_found' | 'no_history_found' | 'unknown';
export type IncumbencyGrade =
  | 'dormant'
  | 'lightly_active'
  | 'clearly_active'
  | 'unknown';
export type ParkingSignal = 'parked' | 'content' | 'unknown';

export interface ProductDescription {
  whatItIs?: string;
  problem?: string;
  audience?: string;
  platform?: string;
  benefits?: string;
  personality?: string;
  countries?: string;
  languages?: string;
  competitors?: string;
  includeWords?: string;
  excludeWords?: string;
  preferredLength?: string;
  oneLine?: string;
  short?: string;
  full?: string;
}

export interface NameLane {
  id: string;
  title: string;
  namingGoal: NamingGoal | null;
  familySelections?: string[];
  createdAt: string;
}

export interface DomainCheck {
  host: string;
  tld: string;
  dnsStatus: Availability;
  rdapStatus: Availability;
  availability: Availability;
  checkedAt: string;
}

export interface BrandCheck {
  source: string;
  result: BrandResult;
  note: string;
  queryUrl: string;
  checkedAt: string;
}

export interface DomainHistory {
  host: string;
  status: HistoryStatus;
  wayback: {
    status: HistoryStatus;
    firstCapture: string | null;
    lastCapture: string | null;
    captureCount: number | null;
  };
  ct: {
    status: HistoryStatus;
    latest: string | null;
    count: number | null;
  };
  googleSiteUrl: string;
  checkedAt: string;
}

export interface VisualConcerns {
  flags: string[];
  note: string;
}

export interface NameMessaging {
  categoryDescriptor?: string;
  positioning?: string;
  taglines?: string[];
  selectedTagline?: string;
  appStoreSubtitle?: string;
  searchTitle?: string;
  searchDescription?: string;
  whatIs?: string;
  sentences?: string[];
  marks?: Record<string, 'clear' | 'needs_work'>;
}

export interface LanguageManualCheck {
  language: string;
  result: 'clear' | 'concern' | 'unknown';
  note: string;
}

export interface LanguageChecks {
  aiAssisted?: { text: string; languages: string[]; checkedAt: string } | null;
  manual?: LanguageManualCheck[];
}

export interface Pronunciation {
  heardSpelling?: string;
  mismatch?: boolean;
  note?: string;
  speechUnsupported?: boolean;
}

export interface CandidateRatings {
  brandFit?: number;
  easyToSay?: number;
  memorable?: number;
}

export interface ComIncumbency {
  grade: IncumbencyGrade;
  parking: ParkingSignal;
  gradedAt: string;
}

export type AutocompleteStatus = 'established' | 'no_hit' | 'unknown';
export type OrganicStatus = 'crowded' | 'quiet' | 'unknown';
export type HandlePlatform =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'youtube'
  | 'x';

export interface AutocompleteEvidence {
  status: AutocompleteStatus;
  suggestions: string[];
  checkedAt: string;
}

export interface OrganicCompetition {
  status: OrganicStatus;
  autocomplete: AutocompleteEvidence;
  checkedAt: string;
}

export interface HandleCheck {
  platform: HandlePlatform;
  handle: string;
  profileUrl: string;
  availability: Availability;
  checkedAt: string;
}

export interface NameCandidate {
  id: string;
  name: string;
  status: CandidateStatus;
  sources: CandidateSource[];
  family?: string | null;
  laneId?: string | null;
  namingGoal?: NamingGoal | string | null;
  derivedFromCandidateId?: string | null;
  rationale?: string;
  notes?: string;
  domainChecks: DomainCheck[];
  googleQueryUrl: string;
  brandChecks?: BrandCheck[];
  domainHistory?: DomainHistory[];
  takenEndingCount?: number;
  comIncumbency?: ComIncumbency | null;
  organicCompetition?: OrganicCompetition | null;
  handleChecks?: HandleCheck[];
  visualConcerns?: VisualConcerns;
  messaging?: NameMessaging;
  languageChecks?: LanguageChecks;
  pronunciation?: Pronunciation;
  ratings?: CandidateRatings;
}

export interface FeedbackMine {
  candidateId: string;
  firstImpression: string;
  rememberedSpelling: string;
  perceivedPurpose: string;
  ratings: Record<string, number>;
  concern: string;
  updatedAt: string;
}

export interface FeedbackAggregate {
  participantCount: number;
  byCandidate: Record<
    string,
    {
      responses: number;
      easyToSay: number | null;
      memorable: number | null;
      fitsProduct: number | null;
      repeatedConcerns: string[];
    }
  >;
}

export interface FeedbackRoundView {
  id: string;
  candidateIds: string[];
  status: 'open' | 'closed';
  createdAt: string;
  closedAt: string | null;
  order: string[];
  mine: FeedbackMine[];
  aggregate: FeedbackAggregate | null;
}

export interface ProjectNameSessionSummary {
  id: string;
  title: string;
  namingGoal: NamingGoal | string | null;
  recommendedName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectNameSession {
  id: string;
  projectId: string;
  title: string;
  brief: string;
  namingGoal: NamingGoal | string | null;
  productDescription: ProductDescription;
  lanes: NameLane[];
  candidates: NameCandidate[];
  shortlistIds: string[];
  recommendedCandidateId: string | null;
  runnerUpCandidateId: string | null;
  decisionNote: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  canManageFeedback: boolean;
  feedback: FeedbackRoundView[];
}

export interface CreateNameSessionInput {
  title: string;
  brief?: string;
  namingGoal?: string;
  productDescription?: ProductDescription;
}

export interface UpdateNameSessionInput {
  title?: string;
  brief?: string;
  namingGoal?: string | null;
  productDescription?: ProductDescription;
  lanes?: NameLane[];
  candidates?: NameCandidate[];
  shortlistIds?: string[];
  runnerUpCandidateId?: string | null;
  decisionNote?: string | null;
}
