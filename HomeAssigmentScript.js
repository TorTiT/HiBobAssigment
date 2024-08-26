const axios = require("axios");
const fs = require("fs");

// Define the path to your JSON file
const dataPath =
  "C:\\Users\\moshereuveni\\OneDrive - Tel-Aviv University\\Desktop\\Moshe\\SalesForce\\מטלות בית\\HiBob -MIS Developer\\employee_list.json";

// Function to call AI API
async function callAIAPI(prompt) {
  const apiUrl =
    "https://apim.workato.com/bobmis_dev/home-task-v1/prompt-completion";
  const apiToken =
    "2193f5f8ad35c99d5c610e49d44fafb5d87b0d63c1afd3844d07737b1994d194"; // Replace with your actual API token

  try {
    const response = await axios.post(
      apiUrl,
      { prompt: prompt },
      {
        headers: {
          "API-TOKEN": apiToken,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.response; // Return the response text
  } catch (error) {
    console.error("Error calling AI API:", error);
    return null;
  }
}

// Function to extract code from AI response
function extractCode(text) {
  const codeMatch = text.match(/```javascript([\s\S]*?)```/);
  return codeMatch ? codeMatch[1].trim() : null;
}

// Example email validation function
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Function to validate employee data
function validateEmployee(employee) {
  const errors = [];

  if (
    !employee.name ||
    typeof employee.name !== "string" ||
    employee.name.trim() === ""
  ) {
    errors.push("Name is required and must be a non-empty string.");
  }

  if (!employee.email || !validateEmail(employee.email)) {
    errors.push("Email is required and must be a valid email address.");
  }

  if (
    employee.age === null ||
    employee.age === undefined ||
    isNaN(employee.age) ||
    employee.age < 0
  ) {
    errors.push("Age must be a valid non-negative number.");
  }

  return errors;
}

// Function to clean up and deduplicate employee data
function cleanupEmployeeData(employees) {
  const uniqueIds = new Set();
  const cleanedData = [];

  for (const employee of employees) {
    const errors = validateEmployee(employee);

    const cleanedEmployee = {
      id: employee.id,
      title: employee.title ? employee.title.trim() : null,
      description: employee.description ? employee.description.trim() : null,
      name: employee.name ? employee.name.trim() : null,
      email: employee.email ? employee.email.toLowerCase().trim() : null,
      age:
        employee.age !== null && employee.age !== undefined
          ? !isNaN(parseFloat(employee.age)) && isFinite(employee.age)
            ? parseFloat(employee.age)
            : null
          : null,
      errors: errors.length ? errors : null,
    };

    if (!uniqueIds.has(employee.id)) {
      uniqueIds.add(employee.id);
      cleanedData.push(cleanedEmployee);
    } else {
      // If it's a duplicate, mark it as invalid with an error message
      cleanedData.push({
        ...cleanedEmployee,
        errors: [...(cleanedEmployee.errors || []), "Duplicate entry."],
      });
    }
  }

  return cleanedData;
}

// Example JSON to CSV conversion function
function jsonToCSV(data) {
  const csvRows = [];
  const headers = Object.keys(data[0]);
  csvRows.push(headers.join(","));

  for (const row of data) {
    const values = headers.map((header) => {
      const escaped = ("" + row[header]).replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

// Function to load JSON data
function loadJSON(filePath) {
  try {
    const rawData = fs.readFileSync(filePath);
    return JSON.parse(rawData);
  } catch (error) {
    console.error("Failed to load or parse JSON data:", error);
    return null;
  }
}

// Function to process data with AI API
async function processDataWithAI() {
  const emailValidationPrompt =
    "Generate a JavaScript function to validate an email address format.";
  const emailValidationResponse = await callAIAPI(emailValidationPrompt);
  const emailValidationCode = extractCode(emailValidationResponse);

  if (emailValidationCode) {
    eval(emailValidationCode); // Define the validateEmail function

    // Load employee data
    const data = loadJSON(dataPath);

    if (data && Array.isArray(data.data)) {
      data.data.forEach((employee) => {
        if (employee.email && validateEmail(employee.email)) {
          console.log(`Valid email: ${employee.email}`);
        } else {
          console.log(`Invalid email: ${employee.email}`);
        }
      });
    } else {
      console.error("Failed to load or process employee data.");
    }
  }

  // Generate and evaluate the cleanup function from AI API
  const cleanupPrompt =
    "Generate a JavaScript function to clean up and deduplicate employee data.";
  const cleanupResponse = await callAIAPI(cleanupPrompt);
  const cleanupCode = extractCode(cleanupResponse);

  if (cleanupCode) {
    try {
      eval(cleanupCode); // Define the cleanAndDeduplicateEmployeeData function
    } catch (error) {
      console.error("Error evaluating data cleanup code:", error);
      return;
    }
  } else {
    console.error("Failed to extract data cleanup function.");
    return;
  }

  // Load and clean employee data
  const employeeData = loadJSON(dataPath);
  if (employeeData && Array.isArray(employeeData.data)) {
    const cleanedData = cleanupEmployeeData(employeeData.data); // Apply the cleanup function to your employee data
    console.log("Cleaned and Deduplicated Data:", cleanedData);

    // Save the cleaned data back to a file
    fs.writeFileSync(
      "cleaned_employee_list.json",
      JSON.stringify(cleanedData, null, 2)
    );
    console.log("Cleaned data saved to 'cleaned_employee_list.json'");

    // Convert cleaned data to CSV
    const csvData = jsonToCSV(cleanedData);
    console.log("Generated CSV data:", csvData);

    // Save the CSV data to a file
    fs.writeFileSync("employee_data.csv", csvData);
    console.log("CSV data saved to 'employee_data.csv'");
  } else {
    console.error("Loaded data is not an array or failed to load.");
  }
}

// Run the main function
processDataWithAI();
