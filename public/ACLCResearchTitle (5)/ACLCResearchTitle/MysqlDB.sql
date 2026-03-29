USE aclcdb;

CREATE TABLE IF NOT EXISTS research_titles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    sy_yr DATE NOT NULL,
    status ENUM('Pending', 'Approved', 'Rejected'),
    applied ENUM('Not yet', 'On going', 'Done'),
    strand ENUM('GAS', 'ICT'),
    software ENUM('✔', '✘'),
    webpage ENUM('✔', '✘')
);
INSERT INTO research_titles (title, sy_yr, status, applied, strand, software, webpage) VALUES
('Research Title checker', '2024-01-15', 'Pending', 'Not yet', 'ICT', '✔', '✘');