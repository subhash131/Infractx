import { DesignView } from "@/modules/design/ui/design-view";

type PageProps = {
  params: Promise<{
    fileId: string;
  }>;
};

const Page = async ({ params }: PageProps) => {
  const canvasId = (await params).fileId;

  return <DesignView canvasId={canvasId} />;
};

export default Page;
