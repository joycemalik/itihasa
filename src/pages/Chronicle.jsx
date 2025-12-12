import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ArticleView from '../components/ArticleView';
import { articles } from '../data/content';

const Chronicle = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Find the article based on ID param, fallback to first if not found
    const article = articles.find(a => a.id === id) || articles[0];

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const pageTransition = {
        initial: { opacity: 0, scale: 1.05, filter: 'blur(10px)' },
        animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
        exit: { opacity: 0, scale: 0.95, filter: 'blur(10px)' },
        transition: { duration: 1.0, ease: [0.22, 1, 0.36, 1] }
    };

    return (
        <motion.div
            className="fixed inset-0 z-50 bg-[#1a1510]"
            {...pageTransition}
        >
            <ArticleView
                article={article}
                onClose={() => navigate(-1)} // Go back on close
            />
        </motion.div>
    );
};

export default Chronicle;
