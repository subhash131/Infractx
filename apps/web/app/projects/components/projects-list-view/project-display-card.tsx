import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export function ProjectDisplayCard({
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
    <Card className="relative mx-auto w-full max-w-sm pt-0">
      <div className="absolute inset-0 z-30 aspect-video bg-black/35" />
      <img
        src={imageUrl || "https://avatar.vercel.sh/shadcn1"}
        alt="Event cover"
        className="relative z-20 aspect-video w-full object-cover brightness-60 grayscale dark:brightness-40"
      />
      <CardHeader>
        <CardAction>
          <Badge variant="secondary">{updatedAt}</Badge>
        </CardAction>
        <CardTitle>{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
