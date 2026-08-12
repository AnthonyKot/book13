export interface Chapter {
  id: string;
  tag: string;
  title: string;
  content: string;
  challengeTitle: string;
  challengeDescription: string;
  initialCode: string;
  validate: (code: string) => { success: boolean; message: string };
}
