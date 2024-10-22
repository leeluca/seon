import { useForm } from '@tanstack/react-form'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

import NewGoalForm, { NewGoal } from '~/components/NewGoalForm'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import db from '~/lib/database'
import { Database } from '~/lib/powersync/AppSchema'
import { useUser } from '~/states/userContext'
import { generateUUIDs } from '~/utils'

export const Route = createFileRoute('/_main/goals/new')({
  component: NewGoalDialog,
})

type GoalSubmitData = Pick<
  Database['goal'],
  | 'title'
  | 'target'
  | 'unit'
  | 'startDate'
  | 'targetDate'
  | 'initialValue'
  | 'userId'
>

async function handleSave(
  {
    title,
    target,
    unit,
    startDate,
    targetDate,
    initialValue,
    userId,
  }: GoalSubmitData,
  callback?: () => void,
) {
  const { uuid, shortUuid } = generateUUIDs()

  try {
    await db
      .insertInto('goal')
      .values({
        id: uuid,
        shortId: shortUuid as string,
        title,
        currentValue: initialValue,
        initialValue,
        target: target,
        unit,
        userId,
        startDate: startDate,
        targetDate: targetDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .executeTakeFirstOrThrow()

    toast.success('Sucessfully added goal')
    callback && callback()
  } catch (error) {
    console.error(error)
    toast.error('Failed to add goal')
  }
}

function NewGoalDialog() {
  const navigate = useNavigate()
  const user = useUser()
  const handleClose = () => {
    void navigate({ from: '/goals/new', to: '/goals', replace: true })
  }
  const form = useForm<NewGoal>({
    defaultValues: {
      title: '',
      targetValue: 0,
      unit: '',
      startDate: new Date(),
      targetDate: undefined,
      initialValue: 0,
    },
    validators: {
      onChange({ value }) {
        const { title, targetValue, targetDate } = value
        if (!title || !targetValue || !targetDate) {
          return 'Missing required fields'
        }
      },
    },
    onSubmit: async ({ value }) => {
      const { startDate, targetDate, targetValue } = value
      if (!targetDate || !user || !targetValue) {
        return
      }
      const stringStartDate = startDate.toISOString()
      const stringTargetDate = targetDate.toISOString()
      await handleSave(
        {
          ...value,
          title: value.title.trim(),
          unit: value.unit.trim(),
          target: targetValue,
          userId: user.id,
          startDate: stringStartDate,
          targetDate: stringTargetDate,
        },
        handleClose,
      )
    },
  })

  return (
    <Dialog
      open={true}
      onOpenChange={() => {
        handleClose()
      }}
    >
      <DialogContent className="sm:max-w-screen-sm">
        <DialogHeader>
          <DialogTitle>Add new goal</DialogTitle>
          <DialogDescription>
            Set up your new goal. You can always edit it later.
          </DialogDescription>
        </DialogHeader>
        <NewGoalForm form={form} />
      </DialogContent>
    </Dialog>
  )
}

export default NewGoalDialog
