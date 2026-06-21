import { UnitSelector } from "@/components/UnitSelector"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TabPosBayar from "@/components/pembayaran/TabPosBayar"
import TabUnitPos from "@/components/pembayaran/TabUnitPos"
import TabPajak from "@/components/pembayaran/TabPajak"
import TabPaket from "@/components/pembayaran/TabPaket"
import TabJenisBayar from "@/components/pembayaran/TabJenisBayar"



export default function SettingPembayaran() {
  return (
    <UnitSelector>
      {(unitKerjaId, pesantrenId) => (
        <SettingPembayaranContent
          unitKerjaId={unitKerjaId}
          pesantrenId={pesantrenId}
        />
      )}
    </UnitSelector>
  )
}

function SettingPembayaranContent({
  unitKerjaId,
  pesantrenId,
}: {
  unitKerjaId: string
  pesantrenId: string
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Setting Pembayaran</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Konfigurasi master data pembayaran SPP
        </p>
      </div>

      <Tabs defaultValue="pos_bayar">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-0">
          {[
            { value: "pos_bayar", label: "Pos Bayar" },
            { value: "jenis_bayar", label: "Jenis Bayar" },
            { value: "paket", label: "Paket Pembayaran" },
            { value: "pajak", label: "Pajak" },
            { value: "unit_pos", label: "Unit POS" },
          ].map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="pos_bayar" className="mt-5">
          <TabPosBayar unitKerjaId={unitKerjaId} pesantrenId={pesantrenId} />
        </TabsContent>
        <TabsContent value="jenis_bayar" className="mt-5">
          <TabJenisBayar unitKerjaId={unitKerjaId} pesantrenId={pesantrenId} />
        </TabsContent>
        <TabsContent value="paket" className="mt-5">
          <TabPaket unitKerjaId={unitKerjaId} pesantrenId={pesantrenId} />
        </TabsContent>
        <TabsContent value="pajak" className="mt-5">
          <TabPajak unitKerjaId={unitKerjaId} pesantrenId={pesantrenId} />
        </TabsContent>
        <TabsContent value="unit_pos" className="mt-5">
          <TabUnitPos unitKerjaId={unitKerjaId} pesantrenId={pesantrenId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
