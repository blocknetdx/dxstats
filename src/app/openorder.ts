export class Openorder {
  id: string;
  price: number;
  size: string;
  total: string;
  side: string;
  type: string;
  post_only: boolean;
  created_at: string;
  status: string;
  canceled: boolean;

  static createOpenOrder(props: any): Openorder {
    const instance = new Openorder();
    return Object.assign(instance, props);
  }

}
