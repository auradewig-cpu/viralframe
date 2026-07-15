import { FormData } from '../../types';
import { ContentStyleConfig } from '../contentStyles';
import { LocationRef } from '../../types';

export interface CompileContext {
  form: FormData;
  narrationWPM: number;
  durations: number[];
  nicheData: { psikografis: string; painPoint: string };
  effectiveStyle: ContentStyleConfig;
  charLimit: number;
  toolFormat: string;
  spokenLanguageLabel: string;
  platformList: string;
  platformPrimer: string;
  platformBehavior: string;
  sceneDurationTable: string;
  characterBlock: string;
  characterAnchor: string;
  isFacelessPov: boolean;
  characterSheetUsed: boolean;
  hasLocation: boolean;
  validLocationRefs: LocationRef[];
  sceneLocationRefTable: string;
  hasEnvironmentRef: boolean;
  scene1RefJson: string;
  characterBindingSentence: string;
  characterLocationInstruction: string;
  characterRefInstruction: string;
  langInstruction: string;
  contentGoalBlock: string;
  advancedBlocks: string;
}
