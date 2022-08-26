export interface ResponseMessage {
    type: 'receive' | 'send';
    time: number;
    data: string;
}
