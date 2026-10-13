-- AlterTable: simpan id file Google Drive agar galeri bisa mem-proxy gambar
-- lewat endpoint server (bukan memberi link Drive langsung ke tamu).
ALTER TABLE `collages`
    ADD COLUMN `driveFileId` VARCHAR(191) NULL;