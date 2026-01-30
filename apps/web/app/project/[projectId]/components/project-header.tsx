import React from 'react'
import { CreateDocumentDialog } from './create-document-dialog'
import { Id } from '@workspace/backend/_generated/dataModel';

export const ProjectHeader = ({name,description,projectId}: {name: string, description: string; projectId:Id<"projects">}) => {
  return (
    <div className='w-full px-6 flex items-center justify-between '>
      <div>
        <h1 className='text-2xl font-bold'>{name}</h1>
        <p className='text-sm text-primary'>{description}</p>
      </div>
      <CreateDocumentDialog projectId={projectId}/>
    </div>
  )
}
