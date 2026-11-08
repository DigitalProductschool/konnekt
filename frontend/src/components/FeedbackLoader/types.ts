export interface FeedbackLoaderProps {
  /** What is loading, such as "Loading your connections…" */
  label: string;
  /**
   * The loader's size: 56 as every screen draws it ("Loader/Spinner 56", the default), or
   * KERN's own 96 as the kit's P22 draws it
   */
  size?: 56 | 96;
}
