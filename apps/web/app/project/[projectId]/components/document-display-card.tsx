import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export function DocumentDisplayCard({
  name,
  description,
  imageUrl,
  updatedAt,
}: {
  name: string;
  description?: string;
  imageUrl?: string;
  updatedAt?: string;
}) {
  return (
    <Card className="relative w-full pt-0 hover:shadow-lg transition-shadow">
      <div className="absolute inset-0 z-30 aspect-video bg-black/35 rounded-t-lg" />
      <img
        src={imageUrl || "https://avatar.vercel.sh/shadcn1"}
        alt="Event cover"
        className="relative z-20 aspect-video w-full object-cover brightness-60 grayscale dark:brightness-40 rounded-t-lg"
      />
      <CardHeader>
        <CardAction>
          <Badge variant="secondary">{updatedAt}</Badge>
        </CardAction>
        <CardTitle>{name}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
    </Card>
  );
}
