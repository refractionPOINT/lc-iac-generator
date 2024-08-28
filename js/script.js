// app versioning
const version = '1.0.0';

// begin yaml generation
let currentYAMLState = {}; // Store the current state of the YAML
async function generateYAML() {
    if (!validateInput()) {
        return;
    }

    // Reset currentYAMLState to start fresh
    currentYAMLState = { version: 3 };

    let apiResources = [];
    let lookupResources = [];
    let extensions = [];
    let hives = {};
    let hasArtifactSelection = false;


    // collect artifacts
    const artifactCollection = {};
    const artifactConfigurations = ['linux-logs', 'mac-logs', 'windows-evtx-uploads', 'windows-wel-streaming'];

    artifactConfigurations.forEach(configId => {
        const patterns = getPatterns(configId);
        if (patterns.length > 0) {
            hasArtifactSelection = true;
            artifactCollection[configId] = {
                days_retention: parseInt(document.getElementById('days_retention').value, 10),
                filters: { platforms: [configId.split('-')[0]] },
                is_delete_after: document.getElementById('is_delete_after').value.toLowerCase() === 'true',
                is_ignore_cert: document.getElementById('is_ignore_cert').value.toLowerCase() === 'true',
                patterns: patterns
            };
        }
    });

    // Ensure ext-artifact configuration is consistent
    const extArtifactCheckbox = document.getElementById('ext-artifact');
    if (hasArtifactSelection) {
        if (extArtifactCheckbox && !extArtifactCheckbox.checked) {
            extArtifactCheckbox.checked = true;
            markAutoEnabledCheckbox(extArtifactCheckbox);
        }
        hives['extension_config'] = {
            'ext-artifact': {
                data: {
                    log_rules: artifactCollection
                },
                usr_mtd: {
                    enabled: true,
                    expiry: 0,
                    tags: [],
                    comment: ""
                }
            }
        };
    } else {
        if (extArtifactCheckbox && extArtifactCheckbox.checked && !extensions.includes('ext-artifact')) {
            const index = extensions.indexOf('ext-artifact');
            if (index > -1) {
                extensions.splice(index, 1);
            }
        }
    }

    document.querySelectorAll('input[name="api"]:checked').forEach((checkbox) => {
        apiResources.push(checkbox.value);
    });

    document.querySelectorAll('input[name="lookup"]:checked').forEach((checkbox) => {
        lookupResources.push(checkbox.value);
    });

    document.querySelectorAll('input[name="extensions"]:checked').forEach((checkbox) => {
        extensions.push(checkbox.value);
    });

    // Merge current resources and extensions instead of resetting currentYAMLState
    const yamlObject = { ...currentYAMLState, version: 3 }; // Start with existing state

    if (apiResources.length > 0 || lookupResources.length > 0) {
        yamlObject.resources = yamlObject.resources || {}; // Initialize resources if not present
        if (apiResources.length > 0) {
            yamlObject.resources.api = apiResources;
        }
        if (lookupResources.length > 0) {
            yamlObject.resources.lookup = lookupResources;
        }
    }

    if (extensions.length > 0) {
        yamlObject.extensions = extensions;
    }

    if (Object.keys(hives).length > 0) {
        yamlObject.hives = { ...yamlObject.hives, ...hives }; // Merge hives
    }

    currentYAMLState = { ...yamlObject }; // Update currentYAMLState

    // Apply the selected templates
    const templateCheckboxes = document.querySelectorAll('.template-checkbox');
    for (const checkbox of templateCheckboxes) {
        const templateFilePath = checkbox.getAttribute('data-template-path');
        if (checkbox.checked && templateFilePath) {
            await applyTemplate(templateFilePath);
        }
    }

    removeEmptyKeys(currentYAMLState);
    
    const stateToSerialize = JSON.parse(JSON.stringify(currentYAMLState));
    const yamlOutput = jsyaml.dump(stateToSerialize, { skipInvalid: true });

    const codeElement = document.getElementById('yamlOutput');
    codeElement.textContent = yamlOutput;
    
    Prism.highlightElement(codeElement);
}
function removeEmptyKeys(yamlObject) {
    for (const key in yamlObject) {
        if (Array.isArray(yamlObject[key]) && yamlObject[key].length === 0) {
            delete yamlObject[key];
        } else if (typeof yamlObject[key] === 'object' && yamlObject[key] !== null) {
            removeEmptyKeys(yamlObject[key]);
            if (Object.keys(yamlObject[key]).length === 0) {
                delete yamlObject[key];
            }
        }
    }
}
// end yaml generation

// begin template functions
async function applyTemplate(templateFilePath) {    
    if (!templateFilePath) return;

    const loadedYAML = await loadYAMLFromFile(templateFilePath);

    if (loadedYAML) {
        mergeYAMLObjects(currentYAMLState, loadedYAML);

        // Check corresponding checkboxes based on the merged YAML
        if (loadedYAML.resources && loadedYAML.resources.api) {
            loadedYAML.resources.api.forEach(apiResource => {
                const checkbox = document.querySelector(`input[name="api"][value="${apiResource}"]`);
                if (checkbox && !checkbox.checked) {
                    checkbox.checked = true;
                    markAutoEnabledCheckbox(checkbox);
                }
            });
        }

        if (loadedYAML.resources && loadedYAML.resources.lookup) {
            loadedYAML.resources.lookup.forEach(lookupResource => {
                const checkbox = document.querySelector(`input[name="lookup"][value="${lookupResource}"]`);
                if (checkbox && !checkbox.checked) {
                    checkbox.checked = true;
                    markAutoEnabledCheckbox(checkbox);
                }
            });
        }

        if (loadedYAML.extensions) {
            loadedYAML.extensions.forEach(extension => {
                const checkbox = document.querySelector(`input[name="extensions"][value="${extension}"]`);
                if (checkbox && !checkbox.checked) {
                    checkbox.checked = true;
                    markAutoEnabledCheckbox(checkbox);
                }
            });
        }
    }
}
async function removeTemplate(templateFilePath) {
    
    if (!templateFilePath) return;

    const loadedYAML = await loadYAMLFromFile(templateFilePath);

    if (loadedYAML) {
        removeMergedYAML(currentYAMLState, loadedYAML);

        // Uncheck corresponding checkboxes based on the removed YAML
        if (loadedYAML.resources && loadedYAML.resources.api) {
            loadedYAML.resources.api.forEach(apiResource => {
                const checkbox = document.querySelector(`input[name="api"][value="${apiResource}"]`);
                if (checkbox && checkbox.checked) {
                    checkbox.checked = false;
                    clearAutoEnabledCheckbox(checkbox);
                }
            });
        }

        if (loadedYAML.resources && loadedYAML.resources.lookup) {
            loadedYAML.resources.lookup.forEach(lookupResource => {
                const checkbox = document.querySelector(`input[name="lookup"][value="${lookupResource}"]`);
                if (checkbox && checkbox.checked) {
                    checkbox.checked = false;
                    clearAutoEnabledCheckbox(checkbox);
                }
            });
        }

        if (loadedYAML.extensions) {
            loadedYAML.extensions.forEach(extension => {
                const checkbox = document.querySelector(`input[name="extensions"][value="${extension}"]`);
                if (checkbox && checkbox.checked) {
                    checkbox.checked = false;
                    clearAutoEnabledCheckbox(checkbox);
                }
            });
        }
    }
}
async function loadYAMLFromFile(filePath) {
    try {
        const response = await fetch(filePath);
        const yamlText = await response.text();
        return jsyaml.load(yamlText);
    } catch (error) {
        console.error('Error loading YAML file:', error);
        return null;
    }
}
function mergeYAMLObjects(target, source) {
    for (let key in source) {
        if (source.hasOwnProperty(key)) {
            if (Array.isArray(source[key])) {
                // Use a Set to avoid duplicates
                target[key] = target[key] || [];
                const sourceArray = source[key];
                const targetArray = new Set(target[key].map(item => JSON.stringify(item)));

                sourceArray.forEach(item => {
                    const itemKey = JSON.stringify(item);
                    if (!targetArray.has(itemKey)) {
                        targetArray.add(itemKey);
                    }
                });

                // Convert back to array and parse JSON for objects, retain primitives as is
                target[key] = Array.from(targetArray).map(item => {
                    try {
                        return JSON.parse(item);
                    } catch (e) {
                        return item; // Return as is if it's not JSON
                    }
                });
            } else if (typeof source[key] === 'object' && source[key] !== null) {
                target[key] = target[key] || {};
                mergeYAMLObjects(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }
}
function removeMergedYAML(target, source) {
    for (let key in source) {
        if (source.hasOwnProperty(key)) {
            if (Array.isArray(source[key])) {
                if (Array.isArray(target[key])) {
                    // Only remove items that exist in the source, without affecting other items in the target
                    source[key].forEach(item => {
                        const index = target[key].indexOf(item);
                        if (index > -1) {
                            target[key].splice(index, 1);
                        }
                    });
                    if (target[key].length === 0) {
                        delete target[key];
                    }
                }
            } else if (typeof source[key] === 'object' && source[key] !== null) {
                // Recursively remove nested objects
                if (target[key]) {
                    removeMergedYAML(target[key], source[key]);
                    // Check if the object is now empty and remove it if so
                    if (Object.keys(target[key]).length === 0) {
                        delete target[key];
                    }
                }
            } else {
                // Direct value comparison and removal
                if (target[key] === source[key]) {
                    delete target[key];
                }
            }
        }
    }
}
async function loadYAMLAndExtractComments(filePath) {
    try {
        const response = await fetch(filePath);
        const yamlText = await response.text();

        // Extract multi-line comments
        const commentLines = yamlText.split('\n').filter(line => line.trim().startsWith('#'));
        const commentText = commentLines.map(line => line.replace(/^#/, '').trim()).join(' ');

        return commentText;
    } catch (error) {
        console.error('Error loading YAML file:', error);
        return 'No description available.';
    }
}
function populateTemplateDescriptions() {
    const templateCheckboxes = document.querySelectorAll('.template-checkbox');

    templateCheckboxes.forEach(async (checkbox) => {
        const templateFilePath = checkbox.getAttribute('data-template-path');
        if (templateFilePath) {
            const description = await loadYAMLAndExtractComments(templateFilePath);
            const label = checkbox.closest('label');
            if (label) {
                label.setAttribute('data-content', description);
            }
        }
    });
}
// end template functions

// begin artifact functions
function getPatterns(configId) {
    const patterns = [];
    document.querySelectorAll(`#patterns-${configId} input[type="checkbox"]:checked`).forEach((checkbox) => {
        patterns.push(checkbox.value);
    });
    return patterns;
}
function toggleArtifactConfig(configId) {
    const parentCheckbox = document.getElementById(configId);
    const checkboxes = document.querySelectorAll(`#patterns-${configId} input[type="checkbox"]`);

    // Set all child checkboxes to the same state as the parent
    if (parentCheckbox.checked) {
        checkboxes.forEach((checkbox) => {
            checkbox.checked = true;
        });
    } else {
        checkboxes.forEach((checkbox) => {
            checkbox.checked = false;
        });
    }

    // Add an event listener to each child checkbox
    checkboxes.forEach((checkbox) => {
        checkbox.addEventListener('change', () => {
            // If all child checkboxes are unchecked, uncheck the parent checkbox
            const allUnchecked = Array.from(checkboxes).every(cb => !cb.checked);
            if (allUnchecked) {
                parentCheckbox.checked = false;
            } else {
                parentCheckbox.checked = true;
            }
        });
    });
}
function validateInput() {
    let isValid = true;

    const daysRetentionInput = document.getElementById('days_retention');
    const daysRetentionError = document.getElementById('days_retention_error');
    const daysRetentionValue = daysRetentionInput.value;

    if (isNaN(daysRetentionValue) || daysRetentionValue.trim() === '') {
        daysRetentionError.innerText = 'Please enter a valid number.';
        isValid = false;
    } else {
        daysRetentionError.innerText = '';
    }

    const isDeleteAfterInput = document.getElementById('is_delete_after');
    const isDeleteAfterError = document.getElementById('is_delete_after_error');
    const isDeleteAfterValue = isDeleteAfterInput.value.toLowerCase();

    if (isDeleteAfterValue !== 'true' && isDeleteAfterValue !== 'false') {
        isDeleteAfterError.innerText = 'Please enter "true" or "false".';
        isValid = false;
    } else {
        isDeleteAfterError.innerText = '';
    }

    const isIgnoreCertInput = document.getElementById('is_ignore_cert');
    const isIgnoreCertError = document.getElementById('is_ignore_cert_error');
    const isIgnoreCertValue = isIgnoreCertInput.value.toLowerCase();

    if (isIgnoreCertValue !== 'true' && isIgnoreCertValue !== 'false') {
        isIgnoreCertError.innerText = 'Please enter "true" or "false".';
        isValid = false;
    } else {
        isIgnoreCertError.innerText = '';
    }

    return isValid;
}
// end artifact functions

// begin general functions
function initializeListeners() {
    const formInputs = document.querySelectorAll('#yamlForm input');

    formInputs.forEach(input => {
        // Check if the input is not a template checkbox
        if (!input.classList.contains('template-checkbox')) {
            if (input.type === 'text' || input.type === 'textarea') {
                input.addEventListener('input', (event) => {
                    generateYAML();
                });
            } else {
                input.addEventListener('change', (event) => {
                    generateYAML();
                });
            }
        }
    });

    // Template listeners
    const templateCheckboxes = document.querySelectorAll('.template-checkbox');

    templateCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', async function (event) {
            const changedCheckbox = event.target;
            const templateFilePath = changedCheckbox.getAttribute('data-template-path');

            if (changedCheckbox.checked && templateFilePath) {
                generateYAML();
            } else if (!changedCheckbox.checked && templateFilePath) {
                await removeTemplate(templateFilePath);
                generateYAML();
            }
        });
    });

    // Artifact listeners
    const artifactConfigurations = ['linux-logs', 'mac-logs', 'windows-evtx-uploads', 'windows-wel-streaming'];

    // Function to check if all Artifact Collections are disabled
    function checkArtifactStatus() {
        const isAnyArtifactEnabled = artifactConfigurations.some(id => document.getElementById(id).checked);
        const extArtifactCheckbox = document.getElementById('ext-artifact');

        if (!isAnyArtifactEnabled) {
            extArtifactCheckbox.checked = false;
            clearAutoEnabledCheckbox(extArtifactCheckbox);
            generateYAML(); // Update YAML to reflect the change
        }
    }

    // Listen for changes on both parent and child checkboxes
    artifactConfigurations.forEach(configId => {
        const artifactCheckbox = document.getElementById(configId);
        const childCheckboxes = document.querySelectorAll(`#patterns-${configId} input[type="checkbox"]`);

        // Listen for changes on the parent checkbox
        artifactCheckbox.addEventListener('change', () => {
            if (artifactCheckbox.checked) {
                const extArtifactCheckbox = document.getElementById('ext-artifact');
                extArtifactCheckbox.checked = true;
                generateYAML(); // Trigger YAML generation to reflect the change
            } else {
                checkArtifactStatus();
            }
        });

        // Listen for changes on each child checkbox
        childCheckboxes.forEach(childCheckbox => {
            childCheckbox.addEventListener('change', () => {
                const allUnchecked = Array.from(childCheckboxes).every(cb => !cb.checked);
                if (allUnchecked) {
                    artifactCheckbox.checked = false;
                    checkArtifactStatus();
                } else if (childCheckbox.checked) {
                    artifactCheckbox.checked = true;
                    const extArtifactCheckbox = document.getElementById('ext-artifact');
                    extArtifactCheckbox.checked = true;
                    generateYAML(); // Trigger YAML generation to reflect the change
                }
            });
        });
    });

    // about page
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        if (e.target.hash === '#about') {
            loadReadme();
        }
    });
}
function resetForm() {
    document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        checkbox.checked = false;
    });
    
    document.getElementById('yamlOutput').innerText = jsyaml.dump(currentYAMLState, { skipInvalid: true });
    document.getElementById('days_retention').value = '30';
    document.getElementById('is_delete_after').value = 'false';
    document.getElementById('is_ignore_cert').value = 'true';

    document.getElementById('days_retention_error').innerText = '';
    document.getElementById('is_delete_after_error').innerText = '';
    document.getElementById('is_ignore_cert_error').innerText = '';

    generateYAML();
}
function copyToClipboard() {
    const yamlOutput = document.getElementById('yamlOutput');
    const range = document.createRange();
    range.selectNode(yamlOutput);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    try {
        document.execCommand('copy');
        alert('YAML copied to clipboard!');
    } catch (err) {
        alert('Failed to copy YAML.');
    }
    window.getSelection().removeAllRanges();
}
function toggleSelectAll(selectAllCheckbox, tabId) {
    const checkboxes = document.querySelectorAll(`#${tabId} .multi-column input[type="checkbox"]`);
    checkboxes.forEach((checkbox) => {
        checkbox.checked = selectAllCheckbox.checked;
    });

    generateYAML();
}
function handleCollapsingSections() {
    const collapsibleLegends = document.querySelectorAll('legend[data-toggle="collapse"]');

    collapsibleLegends.forEach(legend => {
        const icon = legend.querySelector('.toggle-icon i');

        if (legend.getAttribute('aria-expanded') === 'true') {
            icon.classList.replace('fa-plus', 'fa-minus');
        } else {
            icon.classList.replace('fa-minus', 'fa-plus');
        }

        legend.addEventListener('click', function() {
            const isExpanded = legend.getAttribute('aria-expanded') === 'true';
            if (isExpanded) {
                icon.classList.replace('fa-minus', 'fa-plus');
            } else {
                icon.classList.replace('fa-plus', 'fa-minus');
            }
        });
    });
}
function loadReadme() {
    fetch('./readme.md')
        .then(response => response.text())
        .then(markdown => {
            const aboutContent = document.getElementById('about-content');
            aboutContent.innerHTML = marked.parse(markdown);
        })
        .catch(error => {
            console.error('Error loading README.md:', error);
            const aboutContent = document.getElementById('about-content');
            aboutContent.innerHTML = '<p>Error loading content.</p>';
        });
}
function markAutoEnabledCheckbox(checkbox) {
    const label = checkbox.closest('label');
    if (label) {
        // Disable the checkbox and add the auto-enabled class
        checkbox.disabled = true;
        label.setAttribute('disabled', 'true');
        label.insertAdjacentHTML('beforeend', ' <i class="fas fa-info-circle auto-enabled-icon" title="This option has been enabled by another selection and cannot be disabled."></i>');
    }
}
function clearAutoEnabledCheckbox(checkbox) {
    const label = checkbox.closest('label');
    if (label) {
        // Enable the checkbox and remove the auto-enabled class
        checkbox.disabled = false;
        label.removeAttribute('disabled');
        const icon = label.querySelector('.auto-enabled-icon');
        if (icon) {
            icon.remove();
        }
    }
}
// end general functions

// initialize on load
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.app-version').textContent = `Version: ${version}`;
    $('[data-toggle="popover"]').popover();
    populateTemplateDescriptions();
    handleCollapsingSections();
    initializeListeners();
    Prism.highlightAll();
    generateYAML();
});