declare module "web-push" {
  export type PushSubscription = {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };

  export type SendResult = {
    statusCode?: number;
    headers?: Record<string, string>;
    body?: string;
  };

  export interface WebPushApi {
    setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
    sendNotification(subscription: PushSubscription, payload?: string): Promise<SendResult>;
  }

  const webpush: WebPushApi;
  export default webpush;
}
