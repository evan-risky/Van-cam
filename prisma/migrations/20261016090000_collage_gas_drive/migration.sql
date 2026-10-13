-- AlterTable: kolase tidak lagi disimpan sebagai biner/base64 di MySQL.
-- File kolase disimpan di Google Drive melalui GAS; MySQL hanya menyimpan metadata + drive_file_url.
ALTER TABLE `collages`
    DROP COLUMN `storageMode`,
    DROP COLUMN `filePath`,
    DROP COLUMN `fileData`,
    ADD COLUMN `photoCount` INTEGER NULL,
    ADD COLUMN `driveFileUrl` TEXT NULL,
    ADD COLUMN `driveFileName` VARCHAR(191) NULL;
