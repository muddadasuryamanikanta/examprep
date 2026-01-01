import type { Request, Response } from 'express';
import ExcelJS from 'exceljs';

export const downloadSampleExcel = async (req: Request, res: Response) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sample Import');

        // Define columns
        worksheet.columns = [
            { header: 'TYPE', key: 'type', width: 15 },
            { header: 'QUESTION', key: 'question', width: 40 },
            { header: 'OPTION 1', key: 'option1', width: 20 },
            { header: 'OPTION 2', key: 'option2', width: 20 },
            { header: 'OPTION 3', key: 'option3', width: 20 },
            { header: 'OPTION 4', key: 'option4', width: 20 },
            { header: 'CORRECT OPTION', key: 'correctOption', width: 15 },
            { header: 'EXPLANATION', key: 'explanation', width: 30 },
            { header: 'HINT', key: 'hint', width: 20 }
        ];

        // Add sample row
        worksheet.addRow({
            type: 'single_select_mcq',
            question: 'What is the capital of France?',
            option1: 'London',
            option2: 'Berlin',
            option3: 'Paris',
            option4: 'Madrid',
            correctOption: 'Option 3',
            explanation: 'Paris is the capital and most populous city of France.',
            hint: 'Eiffel Tower is located here.'
        });

        // Style the header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add Data Validation for "Type" column (Rows 2 to 1000)
        // Valid types: note, single_select_mcq, multi_select_mcq, descriptive
        const validTypes = '"note,single_select_mcq,multi_select_mcq,descriptive"';

        for (let i = 2; i <= 1000; i++) {
            worksheet.getCell(`A${i}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [validTypes],
                showErrorMessage: true,
                errorStyle: 'stop',
                errorTitle: 'Invalid Type',
                error: 'Please select a valid content type from the list.'
            };
        }

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sample_import.xlsx');

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error generating sample excel:', error);
        res.status(500).json({ message: 'Could not generate sample file' });
    }
};
