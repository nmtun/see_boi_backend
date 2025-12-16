export class User {
  id: number;
  userName: string | null;
  email: string;
  googleId: string | null;
  facebookId: string | null;
  fullName: string;
  avatarUrl: string | null;
  birthday: Date | null;
  gender: string | null;
  bio: string | null
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}