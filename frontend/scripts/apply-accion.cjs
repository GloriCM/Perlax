const fs = require('fs');
const path = require('path');

function edit(file, fn) {
  let c = fs.readFileSync(file, 'utf8');
  const crlf = c.includes('\r\n');
  c = c.replace(/\r\n/g, '\n');
  const next = fn(c);
  if (next === c) {
    console.log('NO CHANGE', file);
    return false;
  }
  fs.writeFileSync(file, crlf ? next.replace(/\n/g, '\r\n') : next);
  console.log('OK', file);
  return true;
}

const nextService = 'E:/Semillas/Perlax/backend/src/Modules/Production/Perlax.Modules.Production.Infrastructure/Services/DesignPlannerService.next.cs';
const service = 'E:/Semillas/Perlax/backend/src/Modules/Production/Perlax.Modules.Production.Infrastructure/Services/DesignPlannerService.cs';
fs.copyFileSync(nextService, service);
console.log('copied service');

edit('E:/Semillas/Perlax/backend/src/Modules/Production/Perlax.Modules.Production.Infrastructure/Persistence/ProductionDbInitializer.cs', (c) => {
  if (c.includes('DesignPlannerJobs') && c.includes('"Accion"')) return c;
  return c.replace(
    `            CREATE INDEX IF NOT EXISTS "IX_AreaExpenseCapturas_OvertimeGroupId"
                ON production."AreaExpenseCapturas" ("OvertimeGroupId");
            """);
    }
}`,
    `            CREATE INDEX IF NOT EXISTS "IX_AreaExpenseCapturas_OvertimeGroupId"
                ON production."AreaExpenseCapturas" ("OvertimeGroupId");
            """);

        await context.Database.ExecuteSqlRawAsync("""
            ALTER TABLE production."DesignPlannerJobs"
            ADD COLUMN IF NOT EXISTS "Accion" character varying(4000) NOT NULL DEFAULT '';
            """);
    }
}`
  );
});

edit('E:/Semillas/Perlax/backend/src/Modules/Production/Perlax.Modules.Production.Infrastructure/Migrations/ProductionDbContextModelSnapshot.cs', (c) => {
  if (c.includes('b.Property<string>("Accion")')) return c;
  return c.replace(
    `            modelBuilder.Entity("Perlax.Modules.Production.Domain.Entities.DesignPlannerJob", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<string>("Cliente")`,
    `            modelBuilder.Entity("Perlax.Modules.Production.Domain.Entities.DesignPlannerJob", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<string>("Accion")
                        .IsRequired()
                        .HasMaxLength(4000)
                        .HasColumnType("character varying(4000)");

                    b.Property<string>("Cliente")`
  );
});

edit('E:/Semillas/Perlax/backend/src/Modules/Production/Perlax.Modules.Production.Infrastructure/Persistence/DesignPlannerDbSeeder.cs', (c) => {
  if (c.includes('Accion =')) return c;
  return c
    .replace('Trabajo = "Plegadiza RAH Dubai Chocolates",', 'Trabajo = "Plegadiza RAH Dubai Chocolates",\n                Accion = "Ajuste de línea gráfica.",')
    .replace('Trabajo = "Caja Pet 200 x 12",', 'Trabajo = "Caja Pet 200 x 12",\n                Accion = "Preparar artes de caja.",')
    .replace('Trabajo = "Golden OAK",', 'Trabajo = "Golden OAK",\n                Accion = "Validar versión final.",');
});

const front = 'E:/Semillas/Perlax/frontend/src/pages/diseno/programador/PlaneadorDiseno.jsx';
edit(front, (c) => {
  c = c.replace(
    `        trabajo: '',
        responsable: '',
        fechaEntrega: null`,
    `        trabajo: '',
        accion: '',
        responsable: '',
        fechaEntrega: null`
  );

  c = c.replace(
    `        if (!creationForm.trabajo.trim()) errors.trabajo = 'El nombre del trabajo es obligatorio.';
        if (!creationForm.responsable.trim()) errors.responsable = 'El encargado responsable es obligatorio.';`,
    `        if (!creationForm.trabajo.trim()) errors.trabajo = 'El trabajo es obligatorio.';
        if (!creationForm.accion.trim()) errors.accion = 'La acción es obligatoria.';
        if (!creationForm.responsable.trim()) errors.responsable = 'El encargado responsable es obligatorio.';`
  );

  c = c.replace(
    `                trabajo: creationForm.trabajo.trim(),
                responsable: creationForm.responsable.trim(),`,
    `                trabajo: creationForm.trabajo.trim(),
                accion: creationForm.accion.trim(),
                responsable: creationForm.responsable.trim(),`
  );

  c = c.replace(
    `                                <Table.Th>Trabajo</Table.Th>
                                <Table.Th>Diseñador</Table.Th>`,
    `                                <Table.Th>Trabajo</Table.Th>
                                <Table.Th>Acción</Table.Th>
                                <Table.Th>Diseñador</Table.Th>`
  );

  c = c.replace(
    `                                        <Table.Td>
                                            <Text fw={600}>{work.trabajo}</Text>
                                            <Text size="xs" c="dimmed">{work.id}</Text>
                                        </Table.Td>
                                        <Table.Td>{work.responsable}</Table.Td>`,
    `                                        <Table.Td>
                                            <Text fw={600}>{work.trabajo}</Text>
                                            <Text size="xs" c="dimmed">{work.id}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" lineClamp={2}>{work.accion || '-'}</Text>
                                        </Table.Td>
                                        <Table.Td>{work.responsable}</Table.Td>`
  );

  c = c.replace(
    `                    <Select
                        label="Nombre del trabajo"
                        placeholder="Referencia de la OP"
                        searchable
                        clearable
                        nothingFoundMessage="No hay referencias de OP abiertas"
                        data={trabajoOptions.map((item) => ({ value: item.value, label: item.label }))}
                        value={creationForm.trabajo || null}
                        onChange={(value) => {
                            const selected = trabajoOptions.find((item) => item.value === value);
                            setCreationForm((prev) => ({
                                ...prev,
                                trabajo: value || '',
                                cliente: prev.cliente || selected?.clientName || '',
                            }));
                        }}
                        error={creationErrors.trabajo}
                    />`,
    `                    <TextInput
                        label="Trabajo"
                        placeholder="Nombre del trabajo"
                        value={creationForm.trabajo}
                        onChange={(event) => setCreationForm((prev) => ({ ...prev, trabajo: event.currentTarget.value }))}
                        error={creationErrors.trabajo}
                    />
                    <Textarea
                        label="Acción"
                        placeholder="Describe lo que necesita el encargado de diseño"
                        minRows={3}
                        value={creationForm.accion}
                        onChange={(event) => setCreationForm((prev) => ({ ...prev, accion: event.currentTarget.value }))}
                        error={creationErrors.accion}
                    />`
  );

  if (!c.includes('selectedWork.accion') && c.includes('title={selectedWork ? `${selectedWork.id} · ${selectedWork.trabajo}`')) {
    c = c.replace(
      `                        <SimpleGrid cols={{ base: 1, md: 4 }}>
                            <Card className="detail-mini-card">
                                <Text size="xs" c="dimmed">Estado</Text>`,
      `                        {selectedWork.accion ? (
                            <Card className="detail-mini-card">
                                <Text size="xs" c="dimmed">Acción</Text>
                                <Text fw={600}>{selectedWork.accion}</Text>
                            </Card>
                        ) : null}

                        <SimpleGrid cols={{ base: 1, md: 4 }}>
                            <Card className="detail-mini-card">
                                <Text size="xs" c="dimmed">Estado</Text>`
    );
  }

  return c;
});
