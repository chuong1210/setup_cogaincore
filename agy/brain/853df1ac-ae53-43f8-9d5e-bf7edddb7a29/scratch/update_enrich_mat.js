const fs = require('fs');
const file = 'c:/Users/Admin/Desktop/CogainCore/cogain-core/backend/src/Services/ServiceDesk/ServiceDesk.Services/Implement/PackingList/MechanicalPackingLists/MechanicalPackingListService.Enrich.cs';
let content = fs.readFileSync(file, 'utf8');

const oldBlock = `        if (dto.MaterialDetails != null && dto.MaterialDetails.Count > 0)
        {
            foreach (var mat in dto.MaterialDetails)
            {
                mat.PackedQuantity = packedQtyByPlDetailId.GetValueOrDefault(mat.Id, 0m);
                mat.PackedStatus = ComputeDeliveryStatus(mat.PackedQuantity, mat.Quantity);
            }
        }`;

const newBlock = `        if (dto.MaterialDetails != null && dto.MaterialDetails.Count > 0)
        {
            foreach (var mat in dto.MaterialDetails)
            {
                mat.PackedQuantity = packedQtyByPlDetailId.GetValueOrDefault(mat.Id, 0m);
                mat.PackedStatus = ComputeDeliveryStatus(mat.PackedQuantity, mat.Quantity);

                mat.ReceiptQuantity = receiptQtyByPlDetailId.GetValueOrDefault(mat.Id, 0m);
                mat.ReceiptStatus = ComputeDeliveryStatus(mat.ReceiptQuantity, mat.Quantity);

                mat.SiteDeliveryQuantity = deliveryQtyByPlDetailId.GetValueOrDefault(mat.Id, 0m);
                mat.SiteDeliveryStatus = ComputeDeliveryStatus(mat.SiteDeliveryQuantity, mat.Quantity);
            }
        }`;

let normalized = content.replace(/\r\n/g, '\n');
const normOld = oldBlock.replace(/\r\n/g, '\n');

if (!normalized.includes(normOld)) {
    console.error('oldBlock not found');
    process.exit(1);
}

normalized = normalized.replace(normOld, newBlock.replace(/\r\n/g, '\n'));
const finalContent = content.includes('\r\n') ? normalized.replace(/\n/g, '\r\n') : normalized;
fs.writeFileSync(file, finalContent, 'utf8');
console.log('SUCCESS ENRICH MAT');
