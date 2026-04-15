import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import type { UserRole } from '@shared/types/user'
import { UserForm, type UserFormValues } from '@renderer/components/users/UserForm'
import { UserTable } from '@renderer/components/users/UserTable'
import { Button } from '@renderer/components/ui/Button'
import { Card } from '@renderer/components/ui/Card'
import { Modal } from '@renderer/components/ui/Modal'
import { TablePagination } from '@renderer/components/ui/TablePagination'
import { DEFAULT_PAGE_SIZE } from '@shared/types/pagination'
import { useAuthStore } from '@renderer/store/authStore'

function toOptionalValue(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function UserListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const actor = useAuthStore((state) => state.user)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editUserId, setEditUserId] = useState<number | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')

  const availableRoles: UserRole[] = actor?.role === 'admin' ? ['employee', 'manager', 'admin'] : ['employee']

  const sessionQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => window.api.auth.me(),
  })
  const me = sessionQuery.data?.user

  const usersQuery = useQuery({
    queryKey: ['users', 'paged', page, pageSize, search],
    queryFn: () => window.api.users.listPaged({ page, pageSize, search: search.trim() || undefined }),
  })

  const pagedUsers = usersQuery.data?.items ?? []
  const totalUsers = usersQuery.data?.total ?? 0

  const maxPage = useMemo(() => Math.max(1, Math.ceil(totalUsers / pageSize)), [totalUsers, pageSize])

  useEffect(() => {
    if (page > maxPage) {
      setPage(maxPage)
    }
  }, [page, maxPage])

  useEffect(() => {
    setPage(1)
  }, [pageSize, search])

  const editUserQuery = useQuery({
    queryKey: ['users', editUserId],
    queryFn: () => window.api.users.getById(editUserId!),
    enabled: typeof editUserId === 'number' && editUserId > 0,
  })

  const createMutation = useMutation({
    mutationFn: (payload: UserFormValues) =>
      window.api.users.create({
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        documentId: toOptionalValue(payload.documentId),
        email: toOptionalValue(payload.email),
        username: payload.username.trim(),
        role: payload.role,
      }),
    onSuccess: async (result) => {
      setCreateModalOpen(false)
      setFormError(null)
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      navigate(`/usuarios/${result.user.id}`)
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : 'No fue posible crear el usuario.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (args: { id: number; payload: UserFormValues }) =>
      window.api.users.update({
        id: args.id,
        firstName: args.payload.firstName.trim(),
        lastName: args.payload.lastName.trim(),
        documentId: toOptionalValue(args.payload.documentId),
        email: toOptionalValue(args.payload.email),
        username: args.payload.username.trim(),
        role: args.payload.role,
        isActive: args.payload.isActive,
      }),
    onSuccess: async (user) => {
      setEditUserId(null)
      setFormError(null)
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      await queryClient.invalidateQueries({ queryKey: ['users', user.id] })
      navigate(`/usuarios/${user.id}`)
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : 'No fue posible actualizar el usuario.')
    },
  })

  const generatePanelCodeMutation = useMutation({
    mutationFn: (targetEmployeeId: number) => window.api.license.generatePanelAccessCode({ targetEmployeeId }),
  })

  const sendPasswordResetCodeMutation = useMutation({
    mutationFn: (targetEmployeeId: number) => window.api.users.sendPasswordResetEmailCode(targetEmployeeId),
  })

  const lastPanelCode = generatePanelCodeMutation.data

  const closeCreateModal = () => {
    setCreateModalOpen(false)
    setFormError(null)
  }

  const closeEditModal = () => {
    setEditUserId(null)
    setFormError(null)
  }

  const openCreateModal = () => {
    setFormError(null)
    setCreateModalOpen(true)
  }

  const openEditModal = (userId: number) => {
    setFormError(null)
    setEditUserId(userId)
  }

  useEffect(() => {
    const st = location.state as { editUserId?: number } | null
    if (st?.editUserId != null && Number.isFinite(st.editUserId)) {
      setEditUserId(st.editUserId)
      setFormError(null)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, location.pathname, navigate])

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-500">
            Alta y edicion en ventanas modales; consulta el detalle y la documentacion desde la tabla.
          </p>
        </div>
        <Button onClick={openCreateModal} type="button" variant="primary">
          Crear usuario
        </Button>
      </div>

      <Card className="shadow-sm" padding="md">
        <label className="block text-sm text-slate-700">
          Buscar
          <input
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/30"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre, usuario, email o documento"
            type="search"
            value={search}
          />
        </label>
      </Card>

      {usersQuery.isLoading ? (
        <div className="rounded-2xl border border-border bg-surface-card p-5 text-sm text-slate-600 shadow-sm">Cargando usuarios...</div>
      ) : null}

      {usersQuery.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          {usersQuery.error instanceof Error ? usersQuery.error.message : 'No fue posible cargar los usuarios.'}
        </div>
      ) : null}

      {generatePanelCodeMutation.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {generatePanelCodeMutation.error instanceof Error
            ? generatePanelCodeMutation.error.message
            : 'No fue posible generar el codigo.'}
        </div>
      ) : null}

      {sendPasswordResetCodeMutation.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {sendPasswordResetCodeMutation.error instanceof Error
            ? sendPasswordResetCodeMutation.error.message
            : 'No fue posible enviar el codigo.'}
        </div>
      ) : null}

      {lastPanelCode ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium text-slate-900">Codigo temporal para panel de licencias</p>
          <p className="mt-2 font-mono text-lg tracking-wider text-brand">{lastPanelCode.code}</p>
          <p className="mt-2 text-xs text-slate-600">
            Valido hasta {new Date(lastPanelCode.expiresAt).toLocaleString()}. Un solo uso al desbloquear el panel. No lo comparta.
          </p>
        </div>
      ) : null}

      {!usersQuery.isLoading && !usersQuery.error ? (
        <Card className="overflow-hidden border-2 border-slate-200/90 !p-0 shadow-md" padding="md">
          <div className="p-1 sm:p-0">
            <UserTable
              currentUserId={me?.id ?? null}
              currentUserRole={me?.role ?? null}
              users={pagedUsers}
              onEdit={openEditModal}
              onGenerateLicensePanelCode={(userId) => generatePanelCodeMutation.mutate(userId)}
              onSendPasswordResetCode={(userId) => sendPasswordResetCodeMutation.mutate(userId)}
              onView={(userId) => navigate(`/usuarios/${userId}`)}
            />
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={totalUsers}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
              }}
            />
          </div>
        </Card>
      ) : null}

      <Modal maxWidthClass="max-w-lg" onClose={closeCreateModal} open={createModalOpen} title="Nuevo usuario">
        {formError && createModalOpen ? (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{formError}</div>
        ) : null}
        <UserForm
          availableRoles={availableRoles}
          embedded
          mode="create"
          pending={createMutation.isPending}
          submitLabel={createMutation.isPending ? 'Guardando...' : 'Crear usuario'}
          title="Nuevo usuario"
          onCancel={closeCreateModal}
          onSubmit={async (payload) => {
            setFormError(null)
            await createMutation.mutateAsync(payload)
          }}
        />
      </Modal>

      <Modal maxWidthClass="max-w-lg" onClose={closeEditModal} open={editUserId !== null} title="Editar usuario">
        {formError && editUserId !== null ? (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{formError}</div>
        ) : null}
        {editUserQuery.isLoading && editUserId !== null ? (
          <p className="text-sm text-slate-500">Cargando usuario...</p>
        ) : null}
        {editUserQuery.error ? (
          <p className="text-sm text-rose-700">
            {editUserQuery.error instanceof Error ? editUserQuery.error.message : 'No fue posible cargar el usuario.'}
          </p>
        ) : null}
        {editUserQuery.data ? (
          <UserForm
            availableRoles={availableRoles}
            embedded
            key={editUserQuery.data.id}
            mode="edit"
            pending={updateMutation.isPending}
            submitLabel={updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            title="Editar usuario"
            user={editUserQuery.data}
            onCancel={closeEditModal}
            onSubmit={async (payload) => {
              setFormError(null)
              await updateMutation.mutateAsync({ id: editUserQuery.data!.id, payload })
            }}
          />
        ) : null}
      </Modal>
    </section>
  )
}
