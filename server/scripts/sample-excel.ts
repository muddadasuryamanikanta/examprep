import ExcelJS from 'exceljs';
import path from 'path';

async function createSampleExcel() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sample Sheet');

    worksheet.columns = [
        { header: 'Question', key: 'question', width: 40 },
        { header: 'Option A', key: 'optionA', width: 20 },
        { header: 'Option B', key: 'optionB', width: 20 },
        { header: 'Option C', key: 'optionC', width: 20 },
        { header: 'Option D', key: 'optionD', width: 20 },
        { header: 'Answer', key: 'answer', width: 15 }
    ];

    worksheet.addRow({
        question: 'What is the capital of France?',
        optionA: 'London',
        optionB: 'Berlin',
        optionC: 'Paris',
        optionD: 'Madrid',
        answer: 'Option C'
    });
    worksheet.addRow({
        question: 'Which planet is known as the Red Planet?',
        optionA: 'Mars',
        optionB: 'Venus',
        optionC: 'Jupiter',
        optionD: 'Saturn',
        answer: 'Option A'
    });

    // Add some styling
    worksheet.getRow(1).font = { bold: true };

    const outputPath = path.join(process.cwd(), 'sample.xlsx');

    try {
        await workbook.xlsx.writeFile(outputPath);
        console.log(`✅ Sample Excel file created at: ${outputPath}`);
    } catch (error) {
        console.error('❌ Error creating Excel file:', error);
    }
}

createSampleExcel();
