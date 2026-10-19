export type Preferences = {
  largeText: boolean;
  contrast: boolean;
  needs: string[];
  saved: boolean;
};
export const defaultPreferences: Preferences = {
  largeText: false,
  contrast: false,
  needs: ['轮椅通行', '工作人员引导'],
  saved: true,
};
