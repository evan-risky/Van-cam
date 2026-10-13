-- CreateTable
CREATE TABLE `collages` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `status` ENUM('RESERVED', 'UPLOADED', 'FAILED') NOT NULL DEFAULT 'RESERVED',
    `storageMode` VARCHAR(191) NOT NULL,
    `filePath` VARCHAR(191) NULL,
    `fileData` LONGBLOB NULL,
    `mimeType` VARCHAR(191) NULL,
    `byteSize` INTEGER NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `uploadedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `collages_sessionId_key`(`sessionId`),
    INDEX `collages_eventId_idx`(`eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `collages` ADD CONSTRAINT `collages_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `guest_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
