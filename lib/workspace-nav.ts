/** A real workspace row passed from the server layout into the shared UI. */
export interface SidebarWorkspace {
  readonly name: string;
  readonly slug: string;
  readonly runCount: number;
}
