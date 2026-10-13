-- AlterTable: pindah dari penyimpanan Google Drive ke MySQL LONGBLOB
ALTER TABLE `photos`
    DROP COLUMN `driveFileId`,
    ADD COLUMN `fileData` LONGBLOB NULL,
    ADD COLUMN `width` INTEGER NULL,
    ADD COLUMN `height` INTEGER NULL;