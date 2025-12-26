import { DesignView } from "@/modules/design/ui/design-view";

type PageProps = {
  params: Promise<{
    fileId: string;
  }>;
};

const Page = async ({ params }: PageProps) => {
  const fileId = (await params).fileId;

  return <DesignView fileId={fileId} />;
};

export default Page;
