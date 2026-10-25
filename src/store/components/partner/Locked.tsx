import { Card } from "./ui";
export default function Locked({ name }: { name: string }) {
  return (
    <Card>
      <div className="py-8 text-center">
        <div className="text-[18px] font-bold">Available once {name} is verified</div>
        <p className="mx-auto mt-2 max-w-md text-[14.5px] text-muted">Sales and reading data are shared only with verified rights holders. Torii is checking your company now, usually within two working days.</p>
      </div>
    </Card>
  );
}
