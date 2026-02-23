let currentPhoto = 'https://via.placeholder.com/150';
let currentCert = 'https://via.placeholder.com/80';
let currentLink = 'www.example.com';
let currentName = 'John Doe';
let currentSignature = 'https://via.placeholder.com/240x80/ffffff/444444?text=Click+to+add+signature';

// Variabla të reja për tekstin e editueshëm
let currentSummary = 'I am passionate full-stack developer with over eight years of...';
let currentPersonalInfo = [
    '+383 123 456',
    'maldon@gmail.com',
    'Gjilan, Kosova'
];
let currentExperienceHTML = '';
let currentEducationHTML = '';
let currentSkills = ['JavaScript', 'React', 'Node.js', 'HTML & CSS', 'Git', 'SQL'];

let projects = JSON.parse(localStorage.getItem('resumeProjects')) || [];
let selectedProjectIndex = -1;

let currentTemplate = localStorage.getItem('selectedTemplate') || 'pink';

// Input fshehur vetëm për signature
const sigInput = document.createElement('input');
sigInput.type = 'file';
sigInput.accept = 'image/*';
sigInput.style.display = 'none';
document.body.appendChild(sigInput);

function updatePreview() {
    if (document.getElementById('preview-photo')) {
        document.getElementById('preview-photo').src = currentPhoto;
    }
    if (document.querySelector('#preview-cert img')) {
        document.querySelector('#preview-cert img').src = currentCert;
    }
    if (document.getElementById('preview-name')) {
        document.getElementById('preview-name').textContent = currentName;
    }

    const previewLink = document.getElementById('preview-link');
    if (previewLink) {
        if (!currentLink || currentLink === 'www.example.com') {
            previewLink.innerHTML = `<i class="fas fa-link"></i> www.example.com`;
        } else {
            let displayText = currentLink;
            let href = currentLink;

            if (!href.startsWith('http://') && !href.startsWith('https://')) {
                href = 'https://' + href;
            }

            previewLink.innerHTML =
                `<i class="fas fa-link"></i> ` +
                `<a href="${href}" target="_blank" rel="noopener noreferrer" ` +
                `style="color: #6b7280; text-decoration: none;">${displayText}</a>`;
        }
    }

    // Signature update
    const sigImg = document.getElementById('preview-signature');
    if (sigImg) {
        sigImg.src = currentSignature;
    }

    // Rikthe summary nëse ekziston
    const summaryEl = document.getElementById('preview-summary');
    if (summaryEl) summaryEl.textContent = currentSummary;

    // Rikthe personal info
    const personalPs = document.querySelectorAll('.header-personal-info p');
    if (personalPs.length >= 3) {
        personalPs[0].innerHTML = '<i class="fas fa-phone"></i> ' + currentPersonalInfo[0];
        personalPs[1].innerHTML = '<i class="fas fa-envelope"></i> ' + currentPersonalInfo[1];
        personalPs[2].innerHTML = '<i class="fa-solid fa-location-dot"></i> ' + currentPersonalInfo[2];
    }

    // Rikthe experience, education, skills nga HTML / array
    const expSection = document.querySelector('.resume-section.experience');
    if (expSection && currentExperienceHTML) expSection.innerHTML = currentExperienceHTML;

    const eduSection = document.querySelector('.resume-section.education');
    if (eduSection && currentEducationHTML) eduSection.innerHTML = currentEducationHTML;

    const skillsGrid = document.querySelector('.skills-grid');
    if (skillsGrid && currentSkills.length > 0) {
        skillsGrid.innerHTML = currentSkills.map(skill => `<span>${skill}</span>`).join('');
    }
}

function updatePreviewLink() {
    let currentLink = document.getElementById('input-link').value.trim();

    const previewElement = document.getElementById('preview-link');
    const displaySpan = document.getElementById('link-display');

    if (!currentLink) {
        displaySpan.innerHTML = "asnjë link ende";
        return;
    }

    let fullUrl = currentLink;
    if (!currentLink.startsWith('http://') && !currentLink.startsWith('https://')) {
        fullUrl = 'https://' + currentLink;
    }

    displaySpan.innerHTML = `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer">${currentLink}</a>`;
}

function updatePreviewLinkSimple() {
    let currentLink = document.getElementById('input-link').value.trim();

    if (!currentLink) return;

    let fullUrl = currentLink.startsWith('http') ? currentLink : 'https://' + currentLink;

    const preview = document.getElementById('preview-link');
    preview.innerHTML = `<i class="fas fa-link"></i> <a href="${fullUrl}" target="_blank" rel="noopener noreferrer">${currentLink}</a>`;
}

function animateUpdate() {
    const preview = document.getElementById('preview-area');
    if (preview) {
        preview.style.animation = 'none';
        setTimeout(() => { preview.style.animation = 'fadeIn 0.6s ease-in-out'; }, 10);
    }
}

function saveToLocalStorage() {
    const data = {
        photo: currentPhoto,
        cert: currentCert,
        link: currentLink,
        name: currentName,
        signature: currentSignature,
        summary: currentSummary,
        personalInfo: currentPersonalInfo,
        experienceHTML: currentExperienceHTML,
        educationHTML: currentEducationHTML,
        skills: currentSkills
    };
    localStorage.setItem('resumeBuilderData', JSON.stringify(data));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('resumeBuilderData');
    if (saved) {
        const data = JSON.parse(saved);
        currentPhoto = data.photo || currentPhoto;
        currentCert = data.cert || currentCert;
        currentLink = data.link || currentLink;
        currentName = data.name || currentName;
        currentSignature = data.signature || currentSignature;
        currentSummary = data.summary || currentSummary;
        currentPersonalInfo = data.personalInfo || currentPersonalInfo;
        currentExperienceHTML = data.experienceHTML || currentExperienceHTML;
        currentEducationHTML = data.educationHTML || currentEducationHTML;
        currentSkills = data.skills || currentSkills;

        updatePreview();
        animateUpdate();
    }
}

function saveCurrentProject() {
    let projectName = currentName.trim();

    if (projectName === '' || projectName === 'John Doe') {
        projectName = 'Resume ' + (projects.length + 1);
    }

    const newProject = {
        name: projectName,
        photo: currentPhoto,
        cert: currentCert,
        link: currentLink,
        signature: currentSignature,
        summary: currentSummary,
        personalInfo: currentPersonalInfo,
        experienceHTML: currentExperienceHTML,
        educationHTML: currentEducationHTML,
        skills: currentSkills,
        timestamp: new Date().toLocaleString(),
        template: currentTemplate || 'pink'
    };

    projects.push(newProject);
    localStorage.setItem('resumeProjects', JSON.stringify(projects));
}

function applyChanges() {
    let updated = false;
    let pendingUploads = 0;

    const nameInput = document.getElementById('name-input');
    if (nameInput && nameInput.value.trim() !== '') {
        currentName = nameInput.value.trim();
        updated = true;
    }

    const linkInput = document.getElementById('link-input');
    if (linkInput && linkInput.value.trim() !== '') {
        currentLink = linkInput.value.trim();
        updated = true;
    }

    const photoInput = document.getElementById('image-upload');
    if (photoInput?.files?.[0]) {
        pendingUploads++;
        const reader = new FileReader();
        reader.onload = (e) => {
            currentPhoto = e.target.result;
            updatePreview();
            animateUpdate();
            pendingUploads--;
            checkIfAllDone();
        };
        reader.readAsDataURL(photoInput.files[0]);
        updated = true;
    }

    const certInput = document.getElementById('cert-upload');
    if (certInput?.files?.[0]) {
        pendingUploads++;
        const reader = new FileReader();
        reader.onload = (e) => {
            currentCert = e.target.result;
            updatePreview();
            animateUpdate();
            pendingUploads--;
            checkIfAllDone();
        };
        reader.readAsDataURL(certInput.files[0]);
        updated = true;
    }

    if (pendingUploads === 0 && updated) {
        updatePreview();
        animateUpdate();
        saveCurrentProject();
        saveToLocalStorage();
        loadProjectsList();
    }

    function checkIfAllDone() {
        if (pendingUploads === 0 && updated) {
            saveCurrentProject();
            saveToLocalStorage();
            loadProjectsList();
        }
    }
}

function showFileName(input, type) {
    if (input.files && input.files[0]) {
        const fileName = input.files[0].name;
        const status = document.querySelector(`#${type}-upload-section .file-status`);
        status.textContent = `File name: ${fileName.substring(0, 20)}${fileName.length > 20 ? '...' : ''}`;

        const label = document.querySelector(`#${type}-upload-section .upload-label`);
        label.innerHTML = '<i class="fas fa-check-circle"></i> File Selected';
        label.style.borderColor = '#2ecc71';
    }
}

function downloadPDF() {
    document.getElementById('login-modal').style.display = 'flex';
}

function loadProjectsList() {
    const list = document.getElementById('projects-list');
    if (!list) return;

    list.innerHTML = '';

    if (projects.length === 0) {
        list.innerHTML = '<p style="color:white; text-align:center; padding:20px;">You don`t have any project.</p>';
        return;
    }

    projects.forEach((proj, index) => {
        const card = document.createElement('div');
        card.className = 'project-card' + (index === selectedProjectIndex ? ' selected' : '');

        let miniStyle = '';
        if (proj.template === 'pink') {
            miniStyle = 'background: linear-gradient(135deg, #ff9fb9, #ff6b9d);';
        } else if (proj.template === 'dark') {
            miniStyle = 'background: linear-gradient(135deg, #1e293b, #334155);';
        } else if (proj.template === 'mint') {
            miniStyle = 'background: linear-gradient(135deg, #6ee7b7, #34d399);';
        } else {
            miniStyle = 'background: #ffffff;';
        }

        card.innerHTML = `
            <div class="project-preview-mini" style="${miniStyle}">
                <img class="profile-mini" src="${proj.photo}" alt="Profile">
                <img class="cert-mini" src="${proj.cert}" alt="Certificate">
                <div style="position:absolute; bottom:8px; left:8px; color:white; font-size:10px; font-weight:bold; text-shadow:0 1px 3px black;">
                    ${proj.name}
                </div>
            </div>
            <div class="project-info">
                <h4>${proj.name}</h4>
                <small>${proj.timestamp}</small>
            </div>
        `;
        card.onclick = () => loadProjectToPreview(index);
        list.appendChild(card);
    });
}

function loadProjectToPreview(index) {
    const proj = projects[index];
    if (!proj) return;

    currentPhoto = proj.photo;
    currentCert = proj.cert;
    currentLink = proj.link;
    currentName = proj.name;
    currentSignature = proj.signature || currentSignature;
    currentSummary = proj.summary || currentSummary;
    currentPersonalInfo = proj.personalInfo || currentPersonalInfo;
    currentExperienceHTML = proj.experienceHTML || currentExperienceHTML;
    currentEducationHTML = proj.educationHTML || currentEducationHTML;
    currentSkills = proj.skills || currentSkills;
    currentTemplate = proj.template || 'pink';

   selectedProjectIndex = index;
    updatePreview();
    animateUpdate();
    changeTemplate(currentTemplate);

    saveCurrentProject(); //
}

function handleDownload() {
    if (selectedProjectIndex < 0) {
        alert("Please select a resume!");
        return;
    }

    document.getElementById('login-modal').style.display = 'flex';
}

function dummyLogin() {
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('format-modal').style.display = 'flex';

    const profileContainer = document.getElementById('profile-container');
    if (profileContainer) {
        profileContainer.style.display = 'block';
    }
}

function exportResume(format) {
    const element = document.getElementById('preview-area');

    const userName = currentName.trim().replace(/\s+/g, '_') || 'Resume_Name_Surname';

    if (format === 'pdf') {
        html2pdf().from(element).set({
            margin: 0.5,
            filename: `Resume_${userName}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 }
        }).save();
    } else {
        html2canvas(element, { scale: 3 }).then(canvas => {
            let mime = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
            let ext = format;
            const link = document.createElement('a');
            link.download = `Resume_${userName}.${ext}`;
            link.href = canvas.toDataURL(mime, 0.95);
            link.click();
        });
    }

    document.getElementById('format-modal').style.display = 'none';
}

function changeTemplate(templateName) {
    const previewArea = document.getElementById('preview-area');
    if (!previewArea) {
        console.warn("Elementi #preview-area nuk u gjet!");
        return;
    }

    previewArea.classList.remove('pink-modern', 'dark-professional', 'mint-fresh');

    let newClass = '';
    if (templateName === 'pink') newClass = 'pink-modern';
    else if (templateName === 'dark') newClass = 'dark-professional';
    else if (templateName === 'mint') newClass = 'mint-fresh';

    if (newClass) {
        previewArea.classList.add(newClass);
    }

    document.querySelectorAll('.template-mini-card').forEach(card => {
        card.classList.remove('selected');
    });

    const selectedCard = document.querySelector(`.template-mini-card[data-template="${templateName}"]`);
    if (selectedCard) selectedCard.classList.add('selected');

    const nameEl = document.getElementById('preview-name');
    const summaryEl = document.getElementById('preview-summary');
    if (nameEl && summaryEl) {
        if (templateName === 'pink') {
            nameEl.textContent = 'Name Surname';
            summaryEl.textContent = 'Motivated, responsible & creative full-stack developer.';
        } else if (templateName === 'dark') {
            nameEl.textContent = 'Name Surname';
            summaryEl.textContent = 'Experienced software engineer with focus on clean architecture.';
        } else if (templateName === 'mint') {
            nameEl.textContent = 'Name Surname';
            summaryEl.textContent = 'UI/UX enthusiast building beautiful digital experiences.';
        }
    }

    animateUpdate();
    localStorage.setItem('selectedTemplate', templateName);
    currentTemplate = templateName;
}

// ────────────────────────────────────────────────
// Editim direkt i tekstit (contenteditable)
// ────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const editables = document.querySelectorAll('.editable');

    editables.forEach(el => {
        el.addEventListener('blur', () => {
            saveEditableContent(el);
            saveCurrentProject();
            saveToLocalStorage();
            animateUpdate();
        });

        // Ruaj gjatë shkrimit (debounce)
        let timeout;
        el.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                saveEditableContent(el);
                saveCurrentProject();
                saveToLocalStorage();
            }, 800);
        });
    });
});

function saveEditableContent(element) {
    const id = element.id;

    if (id === 'preview-name') {
        currentName = element.textContent.trim();
    } else if (id === 'preview-summary') {
        currentSummary = element.textContent.trim();
    } else if (id === 'preview-link') {
        currentLink = element.textContent.replace(/<i.*?<\/i>/gi, '').trim();
    } else if (element.closest('.header-personal-info')) {
        const infos = document.querySelectorAll('.header-personal-info p');
        currentPersonalInfo = Array.from(infos).map(p => p.textContent.replace(/<i.*?<\/i>/gi, '').trim());
    } else if (element.closest('.resume-section.experience')) {
        currentExperienceHTML = document.querySelector('.resume-section.experience').innerHTML;
    } else if (element.closest('.resume-section.education')) {
        currentEducationHTML = document.querySelector('.resume-section.education').innerHTML;
    } else if (element.closest('.skills-grid')) {
        currentSkills = Array.from(document.querySelectorAll('.skills-grid span')).map(span => span.textContent.trim());
    }
}

// ────────────────────────────────────────────────
// Signature upload (klik direkt)
// ────────────────────────────────────────────────

document.addEventListener('click', function(e) {
    if (e.target.closest('#signature-click-area')) {
        sigInput.click();
    }
});

sigInput.addEventListener('change', function(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(ev) {
        currentSignature = ev.target.result;
        const sigImg = document.getElementById('preview-signature');
        if (sigImg) {
            sigImg.src = currentSignature;
        }
        animateUpdate();
        saveCurrentProject();
        saveToLocalStorage();
    };
    reader.readAsDataURL(file);
});

window.addEventListener('load', () => {
    loadFromLocalStorage();

    if (document.getElementById('projects-list')) {
        loadProjectsList();
    }

    const savedTemplate = localStorage.getItem('selectedTemplate') || 'pink';
    changeTemplate(savedTemplate);
});
