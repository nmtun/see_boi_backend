export class Tag {
    id: number;
    name: string;

    constructor(partial: Partial<Tag>) {
        Object.assign(this, partial);
    }
}